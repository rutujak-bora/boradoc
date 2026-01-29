export type Region = 'russia' | 'dubai';

export interface User {
  email: string;
  region: Region;
}

export interface ShipmentDocument {
  id: string;
  type: ShipmentDocumentType;
  fileName: string;
  filePath: string;
  uploadedAt: Date;
  fileSize: number;
}

export type ShipmentDocumentType = 
  | 'export_invoice'
  | 'packing_list'
  | 'shipping_bill'
  | 'final_checklist'
  | 'serial_number_list'
  | 'awb_seaway_bill';

export interface LogisticBill {
  id: string;
  documentName: string;
  fileName: string;
  filePath: string;
  uploadedAt: Date;
  fileSize: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  region: Region;
  createdAt: Date;
  shipmentDocuments: ShipmentDocument[];
  logisticBills: LogisticBill[];
}

export interface Notification {
  id: string;
  invoiceId: string;
  message: string;
  type: 'missing_document';
  documentType?: ShipmentDocumentType;
}

export const SHIPMENT_DOCUMENT_CONFIG: Record<ShipmentDocumentType, { label: string; mandatory: boolean }> = {
  export_invoice: { label: 'Export Invoice', mandatory: true },
  packing_list: { label: 'Packing List', mandatory: true },
  shipping_bill: { label: 'Shipping Bill', mandatory: true },
  final_checklist: { label: 'Final Checklist', mandatory: true },
  serial_number_list: { label: 'Serial Number List', mandatory: true },
  awb_seaway_bill: { label: 'AWB / Seaway Bill', mandatory: true },
};

export const ACCEPTED_FILE_TYPES = '.pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp';
