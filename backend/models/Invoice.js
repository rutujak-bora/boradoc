import mongoose from 'mongoose';

const ShipmentDocumentSchema = new mongoose.Schema({
    id: String,
    type: {
        type: String,
        enum: ['export_invoice', 'packing_list', 'shipping_bill', 'final_checklist', 'serial_number_list', 'awb_seaway_bill']
    },
    fileName: String,
    filePath: String,
    uploadedAt: { type: Date, default: Date.now },
    fileSize: Number
});

const LogisticBillSchema = new mongoose.Schema({
    id: String,
    documentName: String,
    fileName: String,
    filePath: String,
    uploadedAt: { type: Date, default: Date.now },
    fileSize: Number
});

const InvoiceSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    invoiceNumber: { type: String, required: true },
    region: { type: String, enum: ['russia', 'dubai'], required: true },
    createdAt: { type: Date, default: Date.now },
    shipmentDocuments: [ShipmentDocumentSchema],
    logisticBills: [LogisticBillSchema]
});

export const Invoice = mongoose.model('Invoice', InvoiceSchema);
