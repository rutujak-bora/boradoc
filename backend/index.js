import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Invoice as InvoiceModel } from './models/Invoice.js';

import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

/* ---------------- AWS S3 ---------------- */
const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

/* ---------------- EXPRESS ---------------- */
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

/* ---------------- DATABASES ---------------- */
const russiaConn = mongoose.createConnection(process.env.MONGO_RUSSIA_URI);
const dubaiConn = mongoose.createConnection(process.env.MONGO_DUBAI_URI);

russiaConn.on('connected', () => console.log('✅ Connected to Russia DB'));
dubaiConn.on('connected', () => console.log('✅ Connected to Dubai DB'));
russiaConn.on('error', err => console.error('❌ Russia DB error:', err));
dubaiConn.on('error', err => console.error('❌ Dubai DB error:', err));

const RussiaInvoice = russiaConn.model('Invoice', InvoiceModel.schema);
const DubaiInvoice = dubaiConn.model('Invoice', InvoiceModel.schema);

/* ---------------- HELPERS ---------------- */
const getModelByRegion = (region) => {
    if (region === 'russia') return RussiaInvoice;
    if (region === 'dubai') return DubaiInvoice;
    return null;
};
// Routes
app.get('/api/hello', async (req, res) => {
    try {
        res.json({ message: 'Hello World' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ---------------- ROUTES ---------------- */

/** Get invoices by region */
app.get('/api/invoices/:region', async (req, res) => {
    try {
        const { region } = req.params;
        const Model = getModelByRegion(region);

        if (!Model) {
            return res.status(400).json({ error: 'Invalid region' });
        }

        const invoices = await Model.find().sort({ createdAt: -1 });
        res.status(200).json(invoices);
    } catch (error) {
        console.error('Fetch invoices error:', error);
        res.status(500).json({ error: error.message });
    }
});

/** Create invoice */
app.post('/api/invoices', async (req, res) => {
    try {
        const { invoiceNumber, region, id } = req.body;
        const Model = getModelByRegion(region);

        if (!Model) {
            return res.status(400).json({ error: 'Invalid region' });
        }

        const newInvoice = new Model({ id, invoiceNumber, region });
        await newInvoice.save();

        res.status(201).json(newInvoice);
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ error: error.message });
    }
});

/** Upload document */
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
    try {
        const { invoiceId, region, type, documentName } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const Model = getModelByRegion(region);
        if (!Model) {
            return res.status(400).json({ error: 'Invalid region' });
        }

        const key = `documents/${region}/${invoiceId}/${uuidv4()}-${req.file.originalname}`;

        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        }));

        const update =
            type === 'logistic'
                ? {
                    $push: {
                        logisticBills: {
                            id: uuidv4(),
                            documentName,
                            fileName: req.file.originalname,
                            filePath: key,
                            fileSize: req.file.size,
                        },
                    },
                }
                : {
                    $push: {
                        shipmentDocuments: {
                            id: uuidv4(),
                            type,
                            fileName: req.file.originalname,
                            filePath: key,
                            fileSize: req.file.size,
                        },
                    },
                };

        const invoice = await Model.findOneAndUpdate(
            { id: invoiceId },
            update,
            { new: true }
        );

        res.json(invoice);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

/** View document (signed URL) */
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

/** Delete invoice + S3 files */
app.delete('/api/invoices/:region/:id', async (req, res) => {
    try {
        const { region, id } = req.params;
        const Model = getModelByRegion(region);

        if (!Model) {
            return res.status(400).json({ error: 'Invalid region' });
        }

        const invoice = await Model.findOne({ id });
        if (!invoice) {
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
        console.error('Delete invoice error:', error);
        res.status(500).json({ error: error.message });
    }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the React frontend app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Anything that doesn't match the above, send back index.html
app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'Not Found' });
    }
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
