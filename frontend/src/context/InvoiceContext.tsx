import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Invoice, ShipmentDocument, LogisticBill, Region, ShipmentDocumentType, Notification, SHIPMENT_DOCUMENT_CONFIG } from '@/types';
import { useAuth } from './AuthContext';

import { API_BASE_URL } from '@/config';

const API_BASE = API_BASE_URL;

interface InvoiceContextType {
  invoices: Invoice[];
  addInvoice: (invoiceNumber: string, region: Region) => Promise<Invoice>;
  getInvoicesByRegion: (region: Region) => Invoice[];
  addShipmentDocument: (invoiceId: string, document: Omit<ShipmentDocument, 'id'>) => void;
  addLogisticBill: (invoiceId: string, bill: Omit<LogisticBill, 'id'>) => void;
  removeLogisticBill: (invoiceId: string, billId: string) => void;
  getNotificationsForInvoice: (invoiceId: string) => Notification[];
  getInvoiceById: (id: string) => Invoice | undefined;
  deleteInvoice: (id: string, region: Region) => Promise<boolean>;
}

const InvoiceContext = createContext<InvoiceContextType | undefined>(undefined);

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

export function InvoiceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const fetchInvoices = useCallback(async (region: Region) => {
    try {
      const response = await fetch(`${API_BASE}/invoices/${region}`);
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.region) {
      fetchInvoices(user.region);
    }
  }, [user?.region, fetchInvoices]);

  const addInvoice = useCallback(async (invoiceNumber: string, region: Region): Promise<Invoice> => {
    const id = generateId();
    const response = await fetch(`${API_BASE}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, invoiceNumber, region }),
    });
    const newInvoice = await response.json();
    setInvoices(prev => [newInvoice, ...prev]);
    return newInvoice;
  }, []);

  const deleteInvoice = useCallback(async (id: string, region: Region): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/invoices/${region}/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setInvoices(prev => prev.filter(inv => inv.id !== id));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      return false;
    }
  }, []);

  const getInvoicesByRegion = useCallback((region: Region): Invoice[] => {
    return invoices.filter(inv => inv.region === region);
  }, [invoices]);

  const getInvoiceById = useCallback((id: string): Invoice | undefined => {
    return invoices.find(inv => inv.id === id);
  }, [invoices]);

  const addShipmentDocument = useCallback((_invoiceId: string, _document: Omit<ShipmentDocument, 'id'>) => {
    // This is now handled by the API call in AddDocumentModal
    if (user?.region) fetchInvoices(user.region);
  }, [user?.region, fetchInvoices]);

  const addLogisticBill = useCallback((_invoiceId: string, _bill: Omit<LogisticBill, 'id'>) => {
    // This is now handled by the API call in AddDocumentModal
    if (user?.region) fetchInvoices(user.region);
  }, [user?.region, fetchInvoices]);

  const removeLogisticBill = useCallback((_invoiceId: string, _billId: string) => {
    // To be implemented if needed
  }, []);

  const getNotificationsForInvoice = useCallback((invoiceId: string): Notification[] => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return [];

    const notifications: Notification[] = [];
    const uploadedTypes = new Set(invoice.shipmentDocuments.map(d => d.type));

    Object.entries(SHIPMENT_DOCUMENT_CONFIG).forEach(([type, config]) => {
      if (config.mandatory && !uploadedTypes.has(type as ShipmentDocumentType)) {
        notifications.push({
          id: generateId(),
          invoiceId,
          message: `${config.label} not uploaded`,
          type: 'missing_document',
          documentType: type as ShipmentDocumentType,
        });
      }
    });

    return notifications;
  }, [invoices]);

  return (
    <InvoiceContext.Provider
      value={{
        invoices,
        addInvoice,
        deleteInvoice,
        getInvoicesByRegion,
        addShipmentDocument,
        addLogisticBill,
        removeLogisticBill,
        getNotificationsForInvoice,
        getInvoiceById,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoices() {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error('useInvoices must be used within an InvoiceProvider');
  }
  return context;
}
