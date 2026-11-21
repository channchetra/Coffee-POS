export interface PrintableInvoice {
  invoiceNo: string;
  cashierName: string;
  createdAt: string;
  totalKHR: number;
  paidKHR: number;
  changeKHR: number;
  paymentMethod: 'cash' | 'bank';
}

export interface PrintableInvoiceItem {
  id: string;
  nameSnapshot: string;
  qty: number;
  lineTotalKHR: number;
}

export type ReceiptPaperSize = '58mm' | '80mm';
export type ReceiptPrintStyle = 'compact' | 'normal' | 'large';
export type ReceiptPrintMode = 'browser' | 'escpos-intent';

export interface ReceiptPrintOptions {
  paperSize?: ReceiptPaperSize;
  copies?: 1 | 2;
  style?: ReceiptPrintStyle;
}

