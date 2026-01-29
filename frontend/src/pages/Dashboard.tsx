import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useInvoices } from '@/context/InvoiceContext';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { InvoiceTable } from '@/components/dashboard/InvoiceTable';
import { AddDocumentModal } from '@/components/dashboard/AddDocumentModal';
import { DocumentViewerModal } from '@/components/dashboard/DocumentViewerModal';
import { Invoice } from '@/types';
import { FileText, AlertTriangle, CheckCircle, FolderOpen } from 'lucide-react';

import { toast } from 'sonner';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { getInvoicesByRegion, getNotificationsForInvoice, deleteInvoice } = useInvoices();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [viewerModal, setViewerModal] = useState<{
    open: boolean;
    invoice: Invoice | null;
    mode: 'shipment' | 'logistic';
  }>({ open: false, invoice: null, mode: 'shipment' });

  const invoices = useMemo(() => {
    if (!user?.region) return [];
    return getInvoicesByRegion(user.region);
  }, [user?.region, getInvoicesByRegion]);

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This action cannot be undone.`)) {
      return;
    }

    const success = await deleteInvoice(invoice.id, invoice.region);
    if (success) {
      toast.success('Invoice deleted successfully');
    } else {
      toast.error('Failed to delete invoice');
    }
  };

  const stats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalDocuments = invoices.reduce(
      (acc, inv) => acc + inv.shipmentDocuments.length + inv.logisticBills.length,
      0
    );
    const totalMissingDocs = invoices.reduce(
      (acc, inv) => acc + getNotificationsForInvoice(inv.id).length,
      0
    );
    const completeInvoices = invoices.filter(
      inv => getNotificationsForInvoice(inv.id).length === 0
    ).length;

    return { totalInvoices, totalDocuments, totalMissingDocs, completeInvoices };
  }, [invoices, getNotificationsForInvoice]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onAddDocument={() => setShowAddModal(true)} />

      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={FileText}
            label="Total Invoices"
            value={stats.totalInvoices}
            color="primary"
          />
          <StatCard
            icon={FolderOpen}
            label="Total Documents"
            value={stats.totalDocuments}
            color="accent"
          />
          <StatCard
            icon={CheckCircle}
            label="Complete Invoices"
            value={stats.completeInvoices}
            color="success"
          />
          <StatCard
            icon={AlertTriangle}
            label="Missing Documents"
            value={stats.totalMissingDocs}
            color="warning"
          />
        </div>

        {/* Invoice Table */}
        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-display font-semibold text-foreground">
              Invoice Documents
            </h2>
            <p className="text-sm text-muted-foreground">
              Showing {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} for {user?.region === 'russia' ? 'Russia' : 'Dubai'} region
            </p>
          </div>

          <InvoiceTable
            invoices={invoices}
            onViewShipmentDocs={(invoice) =>
              setViewerModal({ open: true, invoice, mode: 'shipment' })
            }
            onViewLogisticBills={(invoice) =>
              setViewerModal({ open: true, invoice, mode: 'logistic' })
            }
            onEditInvoice={(invoice) => {
              setEditInvoice(invoice);
              setShowAddModal(true);
            }}
            onDeleteInvoice={handleDeleteInvoice}
          />
        </div>
      </main>

      <AddDocumentModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setEditInvoice(null);
        }}
        editInvoice={editInvoice}
      />

      <DocumentViewerModal
        open={viewerModal.open}
        onOpenChange={(open) => setViewerModal(prev => ({ ...prev, open }))}
        invoice={viewerModal.invoice}
        mode={viewerModal.mode}
      />
    </div>
  );
}

interface StatCardProps {
  icon: typeof FileText;
  label: string;
  value: number;
  color: 'primary' | 'accent' | 'success' | 'warning';
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div className="card-elevated p-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-2xl font-display font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}
