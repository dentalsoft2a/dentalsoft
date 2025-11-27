import { useMemo } from 'react';

export interface InvoiceItem {
  id: string;
  catalog_item_id?: string;
  description: string;
  ccam_code?: string;
  tooth_number?: string;
  quantity: number;
  unit_price: number;
  cpam_reimbursement: number;
  total: number;
}

export interface InvoiceTotals {
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  cpam_part: number;
  mutuelle_part: number;
  patient_part: number;
}

export function useInvoiceCalculations(
  items: InvoiceItem[],
  mutuelle_part: number = 0,
  tax_rate: number = 0
) {
  const totals = useMemo((): InvoiceTotals => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax_amount = subtotal * (tax_rate / 100);
    const total = subtotal + tax_amount;
    const cpam_part = items.reduce((sum, item) => sum + (item.cpam_reimbursement * item.quantity), 0);
    const patient_part = total - cpam_part - mutuelle_part;

    return {
      subtotal,
      tax_rate,
      tax_amount,
      total,
      cpam_part,
      mutuelle_part,
      patient_part,
    };
  }, [items, mutuelle_part, tax_rate]);

  const calculateItemTotal = (quantity: number, unitPrice: number): number => {
    return quantity * unitPrice;
  };

  const isValidInvoice = (): boolean => {
    if (items.length === 0) return false;
    if (totals.total < 0) return false;
    if (totals.patient_part < 0) return false;
    return true;
  };

  return {
    totals,
    calculateItemTotal,
    isValidInvoice,
  };
}
