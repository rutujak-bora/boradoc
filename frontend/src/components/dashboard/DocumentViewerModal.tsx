import { Invoice, ShipmentDocument, LogisticBill, SHIPMENT_DOCUMENT_CONFIG, ShipmentDocumentType } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, Check, X, Trash2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useInvoices } from '@/context/InvoiceContext';

interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  mode: 'shipment' | 'logistic';
}

export function DocumentViewerModal({ open, onOpenChange, invoice, mode }: DocumentViewerModalProps) {
  const { removeLogisticBill } = useInvoices();

  if (!invoice) return null;

  const handleDownload = (filePath: string, fileName: string) => {
    // In a real app, this would download from the actual file path
    const link = document.createElement('a');
    link.href = filePath;
    link.download = fileName;
    link.click();
  };

  const handleRemoveLogisticBill = (billId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      removeLogisticBill(invoice.id, billId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display flex items-center gap-3">
            {mode === 'shipment' ? 'Shipment Documents' : 'Logistic Bills'}
            <Badge variant="outline" className="font-normal">
              {invoice.invoiceNumber}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {mode === 'shipment' ? (
            <ShipmentDocumentsList
              documents={invoice.shipmentDocuments}
              onDownload={handleDownload}
            />
          ) : (
            <LogisticBillsList
              bills={invoice.logisticBills}
              onDownload={handleDownload}
              onDelete={handleRemoveLogisticBill}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ShipmentDocumentsListProps {
  documents: ShipmentDocument[];
  onDownload: (path: string, name: string) => void;
}

function ShipmentDocumentsList({ documents, onDownload }: ShipmentDocumentsListProps) {
  const uploadedTypes = new Set(documents.map(d => d.type));

  return (
    <div className="space-y-3">
      {(Object.entries(SHIPMENT_DOCUMENT_CONFIG) as [ShipmentDocumentType, { label: string; mandatory: boolean }][]).map(([type, config]) => {
        const doc = documents.find(d => d.type === type);
        const isUploaded = uploadedTypes.has(type);

        return (
          <div
            key={type}
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg border transition-all',
              isUploaded
                ? 'bg-success/5 border-success/20'
                : 'bg-muted/30 border-border'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                isUploaded ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              )}
            >
              {isUploaded ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground flex items-center gap-2">
                {config.label}
                {config.mandatory && (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
              </p>
              {doc ? (
                <p className="text-sm text-muted-foreground truncate">
                  {doc.fileName} • {format(doc.uploadedAt, 'MMM dd, yyyy')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Not uploaded</p>
              )}
            </div>

            {doc && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open(doc.filePath, '_blank')}
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDownload(doc.filePath, doc.fileName)}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface LogisticBillsListProps {
  bills: LogisticBill[];
  onDownload: (path: string, name: string) => void;
  onDelete: (id: string) => void;
}

function LogisticBillsList({ bills, onDownload, onDelete }: LogisticBillsListProps) {
  if (bills.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No logistic bills uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bills.map((bill) => (
        <div
          key={bill.id}
          className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{bill.documentName}</p>
            <p className="text-sm text-muted-foreground truncate">
              {bill.fileName} • {format(bill.uploadedAt, 'MMM dd, yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(bill.filePath, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDownload(bill.filePath, bill.fileName)}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(bill.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
