import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Invoice as InvoiceModel } from './models/Invoice.js';

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

// Multi-database connection setup
const russiaConn = mongoose.createConnection(process.env.MONGO_RUSSIA_URI);
const dubaiConn = mongoose.createConnection(process.env.MONGO_DUBAI_URI);

const RussiaInvoice = russiaConn.model('Invoice', InvoiceModel.schema);
const DubaiInvoice = dubaiConn.model('Invoice', InvoiceModel.schema);

const getModelByRegion = (region) => {
    return region === 'russia' ? RussiaInvoice : DubaiInvoice;
};
// Routes
app.get('/api/hello', async (req, res) => {
    try {
        res.json({ message: 'Hello World' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Routes
app.get('/api/invoices/:region', async (req, res) => {
    try {
        const Model = getModelByRegion(req.params.region);
        const invoices = await Model.find().sort({ createdAt: -1 });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/documents/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer Error:', err);
            return res.status(500).json({ error: `Multer error: ${err.message}`, field: err.field });
        } else if (err) {
            console.error('Unknown Error:', err);
            return res.status(500).json({ error: `Unknown error: ${err.message}` });
        }
        next();
    });
}, async (req, res) => {
    try {
        const { invoiceId, region, type, documentName } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const file = req.file;
        const key = `documents/${region}/${invoiceId}/${uuidv4()}-${file.originalname}`;

        console.log(`Attempting upload to bucket: ${process.env.AWS_BUCKET} in region: ${process.env.AWS_REGION}`);

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await s3Client.send(command);
        console.log('Upload successful to S3');

        const Model = getModelByRegion(region);
        const updateQuery = type === 'logistic'
            ? { $push: { logisticBills: { id: uuidv4(), documentName, fileName: file.originalname, filePath: key, fileSize: file.size } } }
            : { $push: { shipmentDocuments: { id: uuidv4(), type, fileName: file.originalname, filePath: key, fileSize: file.size } } };

        const invoice = await Model.findOneAndUpdate({ id: invoiceId }, updateQuery, { new: true });
        res.json(invoice);
    } catch (error) {
        console.error('S3 Upload Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack, region: process.env.AWS_REGION, bucket: process.env.AWS_BUCKET });
    }
});

app.get('/api/documents/view/:key', async (req, res) => {
    try {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: req.params.key,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({ url });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/invoices', async (req, res) => {
    try {
        const { invoiceNumber, region, id } = req.body;
        const Model = getModelByRegion(region);
        const newInvoice = new Model({ id, invoiceNumber, region });
        await newInvoice.save();
        res.json(newInvoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/invoices/:region/:id', async (req, res) => {
    console.log(`[DELETE] Request received for region: ${req.params.region}, id: ${req.params.id}`);
    try {
        const { region, id } = req.params;
        const Model = getModelByRegion(region);

        const invoice = await Model.findOne({ id });
        if (!invoice) {
            console.log('[DELETE] Invoice not found in DB');
            return res.status(404).json({ error: 'Invoice not found' });
        }

        console.log(`[DELETE] Invoice found: ${invoice.invoiceNumber}. Preparing to delete files.`);

        // Delete files from S3
        const deletePromises = [];

        // Collect all file keys
        const allDocs = [...(invoice.shipmentDocuments || []), ...(invoice.logisticBills || [])];
        console.log(`[DELETE] Found ${allDocs.length} documents to delete from S3.`);

        for (const doc of allDocs) {
            if (doc.filePath) {
                console.log(`[DELETE] Deleting file from S3: ${doc.filePath}`);
                const command = new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET,
                    Key: doc.filePath,
                });
                deletePromises.push(s3Client.send(command));
            }
        }

        // Wait for all deletions (settled to avoid stopping on one error)
        const results = await Promise.allSettled(deletePromises);
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`[DELETE] Failed to delete file ${index}:`, result.reason);
            } else {
                console.log(`[DELETE] Successfully deleted file ${index}`);
            }
        });

        // Delete invoice from DB
        const deletedInvoice = await Model.findOneAndDelete({ id });
        if (deletedInvoice) {
            console.log('[DELETE] Invoice deleted from DB successfully.');
        } else {
            console.log('[DELETE] Failed to delete invoice from DB (findOneAndDelete returned null).');
        }

        res.json({ message: 'Invoice and associated files deleted successfully' });
    } catch (error) {
        console.error('[DELETE] Critical Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
