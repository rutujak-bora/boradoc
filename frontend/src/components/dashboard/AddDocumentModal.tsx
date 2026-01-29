import { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '@/config';
import { useAuth } from '@/context/AuthContext';
import { useInvoices } from '@/context/InvoiceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Invoice, SHIPMENT_DOCUMENT_CONFIG, ShipmentDocumentType, ACCEPTED_FILE_TYPES } from '@/types';
import { Upload, X, FileText, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editInvoice?: Invoice | null;
}

interface LogisticBillEntry {
  id: string;
  documentName: string;
  file: File | null;
}

export function AddDocumentModal({ open, onOpenChange, editInvoice }: AddDocumentModalProps) {
  const { user } = useAuth();
  const { addInvoice, addShipmentDocument, addLogisticBill, invoices, getNotificationsForInvoice } = useInvoices();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [shipmentDocs, setShipmentDocs] = useState<Record<ShipmentDocumentType, File | null>>({
    export_invoice: null,
    packing_list: null,
    shipping_bill: null,
    final_checklist: null,
    serial_number_list: null,
    awb_seaway_bill: null,
  });
  const [logisticBills, setLogisticBills] = useState<LogisticBillEntry[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!editInvoice;
  const missingDocTypes = isEditMode
    ? new Set(getNotificationsForInvoice(editInvoice.id).map(n => n.documentType))
    : new Set<ShipmentDocumentType>();

  // Get already uploaded document types for this invoice
  const uploadedDocTypes = isEditMode
    ? new Set(editInvoice.shipmentDocuments.map(d => d.type))
    : new Set<ShipmentDocumentType>();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setInvoiceNumber('');
      setSelectedInvoiceId(isEditMode ? editInvoice.id : null);
      setShipmentDocs({
        export_invoice: null,
        packing_list: null,
        shipping_bill: null,
        final_checklist: null,
        serial_number_list: null,
        awb_seaway_bill: null,
      });
      setLogisticBills([]);
      setError('');
    }
  }, [open, isEditMode, editInvoice?.id]);

  const existingInvoices = invoices.filter(inv => inv.region === user?.region);

  const handleShipmentDocChange = (type: ShipmentDocumentType, file: File | null) => {
    setShipmentDocs(prev => ({ ...prev, [type]: file }));
  };

  const addLogisticBillEntry = () => {
    setLogisticBills(prev => [...prev, { id: crypto.randomUUID(), documentName: '', file: null }]);
  };

  const updateLogisticBill = (id: string, field: 'documentName' | 'file', value: string | File | null) => {
    setLogisticBills(prev => prev.map(bill =>
      bill.id === id ? { ...bill, [field]: value } : bill
    ));
  };

  const removeLogisticBill = (id: string) => {
    setLogisticBills(prev => prev.filter(bill => bill.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!invoiceNumber.trim() && !selectedInvoiceId) {
      setError('Please enter an invoice number or select an existing invoice');
      return;
    }

    setIsSubmitting(true);

    try {
      let invoiceId = selectedInvoiceId;

      // Create new invoice if needed
      if (!selectedInvoiceId && invoiceNumber.trim()) {
        const newInvoice = await addInvoice(invoiceNumber.trim(), user!.region);
        invoiceId = newInvoice.id;
      }

      // Add shipment documents
      for (const [type, file] of Object.entries(shipmentDocs)) {
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('invoiceId', invoiceId!);
          formData.append('region', user!.region);
          formData.append('type', type);

          const response = await fetch(`${API_BASE_URL}/documents/upload`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Upload failed:', errorData);
            throw new Error(errorData.error || 'Upload failed');
          }

          console.log('Upload successful');
        }
      }

      // Add logistic bills
      for (const bill of logisticBills) {
        if (bill.file && bill.documentName.trim()) {
          const formData = new FormData();
          formData.append('file', bill.file);
          formData.append('invoiceId', invoiceId!);
          formData.append('region', user!.region);
          formData.append('type', 'logistic');
          formData.append('documentName', bill.documentName.trim());

          const response = await fetch(`${API_BASE_URL}/documents/upload`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Logistic bill upload failed:', errorData);
            throw new Error(errorData.error || 'Logistic bill upload failed');
          }

          console.log('Logistic bill upload successful');
        }
      }

      // Refresh invoice data
      addShipmentDocument(invoiceId!, {} as any);

      // Reset form
      onOpenChange(false);
    } catch {
      setError('Failed to upload documents. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectExisting = (id: string) => {
    setSelectedInvoiceId(id);
    setInvoiceNumber('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">
            {isEditMode ? `Upload Documents - ${editInvoice.invoiceNumber}` : 'Add Documents'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Invoice Selection - Hide in edit mode */}
          {!isEditMode && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                <Input
                  id="invoiceNumber"
                  placeholder="Enter invoice number (e.g., INV-2024-001)"
                  value={invoiceNumber}
                  onChange={(e) => {
                    setInvoiceNumber(e.target.value);
                    setSelectedInvoiceId(null);
                  }}
                  disabled={!!selectedInvoiceId}
                />
              </div>

              {existingInvoices.length > 0 && (
                <div className="space-y-2">
                  <Label>Or select existing invoice</Label>
                  <div className="flex flex-wrap gap-2">
                    {existingInvoices.map(inv => (
                      <Button
                        key={inv.id}
                        type="button"
                        variant={selectedInvoiceId === inv.id ? 'accent' : 'outline'}
                        size="sm"
                        onClick={() => handleSelectExisting(inv.id)}
                      >
                        {inv.invoiceNumber}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Info banner in edit mode */}
          {isEditMode && (
            <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-warning">Missing Documents</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload the missing mandatory documents below to complete this invoice.
                </p>
              </div>
            </div>
          )}

          {/* Shipment Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-semibold">Shipment Documents</h3>
              <span className="text-xs text-muted-foreground">(* = mandatory)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.entries(SHIPMENT_DOCUMENT_CONFIG) as [ShipmentDocumentType, { label: string; mandatory: boolean }][])
                .filter(([type]) => {
                  // In edit mode, only show missing documents
                  if (isEditMode) {
                    return !uploadedDocTypes.has(type);
                  }
                  return true;
                })
                .map(([type, config]) => (
                  <DocumentUploadSlot
                    key={type}
                    label={config.label}
                    mandatory={config.mandatory}
                    file={shipmentDocs[type]}
                    onChange={(file) => handleShipmentDocChange(type, file)}
                    isMissing={missingDocTypes.has(type)}
                  />
                ))}
            </div>
            {isEditMode && uploadedDocTypes.size === Object.keys(SHIPMENT_DOCUMENT_CONFIG).length && (
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg text-center">
                <Check className="w-6 h-6 text-success mx-auto mb-2" />
                <p className="text-success font-medium">All shipment documents are uploaded!</p>
              </div>
            )}
          </div>

          {/* Logistic Bills Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-semibold">Logistic Bills</h3>
              <Button type="button" variant="outline" size="sm" onClick={addLogisticBillEntry}>
                <Plus className="w-4 h-4" />
                Add Document
              </Button>
            </div>

            {logisticBills.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-border rounded-lg text-center">
                <p className="text-muted-foreground text-sm">
                  Click "Add Document" to upload logistic bills
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {logisticBills.map((bill) => (
                  <LogisticBillRow
                    key={bill.id}
                    bill={bill}
                    onUpdate={updateLogisticBill}
                    onRemove={() => removeLogisticBill(bill.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading...' : 'Upload Documents'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DocumentUploadSlotProps {
  label: string;
  mandatory: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
  isMissing?: boolean;
}

function DocumentUploadSlot({ label, mandatory, file, onChange, isMissing }: DocumentUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    onChange(selectedFile);
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border-2 border-dashed transition-all duration-200',
        file
          ? 'border-success bg-success/5'
          : isMissing
            ? 'border-warning bg-warning/5 hover:border-warning/70'
            : 'border-border hover:border-accent/50 hover:bg-muted/30'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground truncate">
            {label}
            {mandatory && <span className="text-destructive ml-1">*</span>}
          </p>
          {file ? (
            <p className="text-xs text-success mt-1 truncate flex items-center gap-1">
              <Check className="w-3 h-3" />
              {file.name}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Excel, Word, or Image
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {file && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="p-1 hover:bg-destructive/10 rounded text-destructive"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              'p-2 rounded-lg transition-colors',
              file
                ? 'bg-success/10 text-success hover:bg-success/20'
                : 'bg-muted text-muted-foreground hover:bg-accent/10 hover:text-accent'
            )}
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface LogisticBillRowProps {
  bill: LogisticBillEntry;
  onUpdate: (id: string, field: 'documentName' | 'file', value: string | File | null) => void;
  onRemove: () => void;
}

function LogisticBillRow({ bill, onUpdate, onRemove }: LogisticBillRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />

      <Input
        placeholder="Document name"
        value={bill.documentName}
        onChange={(e) => onUpdate(bill.id, 'documentName', e.target.value)}
        className="flex-1"
      />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={(e) => onUpdate(bill.id, 'file', e.target.files?.[0] || null)}
        className="hidden"
      />

      <Button
        type="button"
        variant={bill.file ? 'success' : 'outline'}
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        {bill.file ? (
          <>
            <Check className="w-4 h-4" />
            {bill.file.name.slice(0, 15)}...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload
          </>
        )}
      </Button>

      <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </div>
  );
}
