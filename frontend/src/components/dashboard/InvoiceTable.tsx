import { Invoice, Notification } from '@/types';
import { useInvoices } from '@/context/InvoiceContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Truck, AlertTriangle, Eye, ChevronRight, Upload, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceTableProps {
  invoices: Invoice[];
  onViewShipmentDocs: (invoice: Invoice) => void;
  onViewLogisticBills: (invoice: Invoice) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
}

export function InvoiceTable({ invoices, onViewShipmentDocs, onViewLogisticBills, onEditInvoice, onDeleteInvoice }: InvoiceTableProps) {
  const { getNotificationsForInvoice } = useInvoices();

  if (invoices.length === 0) {
    return (
      <div className="card-elevated p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-display font-semibold text-foreground mb-2">
          No Invoices Found
        </h3>
        <p className="text-muted-foreground mb-4">
          Add your first invoice to start managing documents
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                Invoice Number
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                Shipment Documents
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                Logistic Bills
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                Notifications
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                Created
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((invoice) => {
              const notifications = getNotificationsForInvoice(invoice.id);
              return (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  notifications={notifications}
                  onViewShipmentDocs={() => onViewShipmentDocs(invoice)}
                  onViewLogisticBills={() => onViewLogisticBills(invoice)}
                  onEditInvoice={() => onEditInvoice(invoice)}
                  onDeleteInvoice={() => onDeleteInvoice(invoice)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface InvoiceRowProps {
  invoice: Invoice;
  notifications: Notification[];
  onViewShipmentDocs: () => void;
  onViewLogisticBills: () => void;
  onEditInvoice: () => void;
  onDeleteInvoice: () => void;
}

function InvoiceRow({ invoice, notifications, onViewShipmentDocs, onViewLogisticBills, onEditInvoice, onDeleteInvoice }: InvoiceRowProps) {
  const shipmentCount = invoice.shipmentDocuments.length;
  const logisticCount = invoice.logisticBills.length;
  const hasNotifications = notifications.length > 0;

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="py-4 px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{invoice.invoiceNumber}</p>
            <p className="text-xs text-muted-foreground capitalize">{invoice.region} region</p>
          </div>
        </div>
      </td>

      <td className="py-4 px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewShipmentDocs}
          className="gap-2"
        >
          <Eye className="w-4 h-4" />
          <span>{shipmentCount}/6 uploaded</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </td>

      <td className="py-4 px-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewLogisticBills}
          className="gap-2"
        >
          <Truck className="w-4 h-4" />
          <span>{logisticCount} document{logisticCount !== 1 ? 's' : ''}</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </td>

      <td className="py-4 px-6">
        {hasNotifications ? (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {notifications.slice(0, 2).map((notif) => (
              <Badge
                key={notif.id}
                variant="destructive"
                className="text-xs gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                {notif.message}
              </Badge>
            ))}
            {notifications.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{notifications.length - 2} more
              </Badge>
            )}
          </div>
        ) : (
          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
            All documents uploaded
          </Badge>
        )}
      </td>

      <td className="py-4 px-6 text-sm text-muted-foreground">
        {format(invoice.createdAt, 'MMM dd, yyyy')}
      </td>

      <td className="py-4 px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditInvoice}
            className="gap-2 border-primary text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteInvoice}
            className="gap-2 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Delete Invoice"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
