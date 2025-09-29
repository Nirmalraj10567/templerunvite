export interface DonationItem {
  id: number;
  product_name: string | null;
  description: string | null;
  quantity: number | null;
  category: string | null;
  donor_name: string | null;
  donor_contact: string | null;
  donation_date: string | null;
  notes: string | null;
  status: string | null;
  register_no?: string | null;
  [key: string]: any; // For any additional properties
}

export interface DonationProductLog {
  id: number;
  donation_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  donation_name: string | null;
  receipt_number: string | null;
  details: any;
}

export interface DonationFormData {
  product: string;
  quantity: number | '';
  description: string;
  category: string;
  donorName: string;
  donorContact: string;
  donationDate: string;
  notes: string;
  status: string;
}

export type ColumnKey = '#' | 'receipt' | 'contact' | 'date' | 'donor' | 'category' | 'product' | 'qty' | 'description' | 'print' | 'actions';

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  align?: 'left' | 'right' | 'center';
}

export interface DonationTableProps {
  items: DonationItem[];
  loading: boolean;
  visibleCols: Record<ColumnKey, boolean>;
  onEdit: (item: DonationItem) => void;
  onDelete: (item: DonationItem) => void;
  onPrint: (item: DonationItem) => void;
  onShowLogs: (item: DonationItem) => void;
  isLastReceipt: (item: DonationItem) => boolean;
  t: (en: string, ta: string) => string;
}
