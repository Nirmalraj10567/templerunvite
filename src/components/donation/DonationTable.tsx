import React from 'react';
import { ColumnKey, DonationItem, DonationTableProps } from '@/types/donation';
import { Button } from '@/components/ui/button';
import { FileText, Trash2, Eye } from 'lucide-react';
import { PrintButton } from '@/components/ui/print-button';

export const DonationTable: React.FC<DonationTableProps> = ({
  items,
  loading,
  visibleCols,
  onEdit,
  onDelete,
  onPrint,
  onShowLogs,
  isLastReceipt,
  t,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('No donations found', 'நன்கொடைகள் எதுவும் கிடைக்கவில்லை')}
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const getCellContent = (item: DonationItem, key: ColumnKey) => {
    switch (key) {
      case '#':
        return items.indexOf(item) + 1;
      case 'receipt':
        return (item as any).register_no || '-';
      case 'contact':
        return item.donor_contact || '-';
      case 'date':
        return formatDate(item.donation_date);
      case 'donor':
        return item.donor_name || '-';
      case 'category':
        return item.category || '-';
      case 'product':
        return item.product_name || '-';
      case 'qty':
        return (item as any).quantity || '0';
      case 'description':
        return item.description || '-';
      case 'print':
        return (
          <div className="flex justify-center">
            <PrintButton onClick={() => onPrint(item)} />
          </div>
        );
      case 'actions':
        return (
          <div className="flex justify-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onShowLogs(item)}
              title={t('View Logs', 'பதிவுகளைக் காட்டு')}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(item)}
              title={t('Edit', 'திருத்து')}
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item)}
              disabled={!isLastReceipt(item)}
              title={
                isLastReceipt(item)
                  ? t('Delete', 'நீக்கு')
                  : t('Only latest receipt can be deleted', 'சமீபத்திய ரசீது மட்டுமே நீக்க முடியும்')
              }
              className={!isLastReceipt(item) ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        );
      default:
        return '-';
    }
  };

  const columns = [
    { key: '#' as ColumnKey, label: '#', align: 'center' as const },
    { key: 'receipt' as ColumnKey, label: t('Receipt No', 'ரசீது எண்') },
    { key: 'contact' as ColumnKey, label: t('Contact', 'தொடர்பு') },
    { key: 'date' as ColumnKey, label: t('Date', 'தேதி') },
    { key: 'donor' as ColumnKey, label: t('Donor', 'நன்கொடையாளர்') },
    { key: 'category' as ColumnKey, label: t('Category', 'வகை') },
    { key: 'product' as ColumnKey, label: t('Product', 'பொருள்') },
    { key: 'qty' as ColumnKey, label: t('Qty', 'அளவு'), align: 'right' as const },
    { key: 'description' as ColumnKey, label: t('Description', 'விளக்கம்') },
    { key: 'print' as ColumnKey, label: t('Print', 'அச்சிடு'), align: 'center' as const },
    { key: 'actions' as ColumnKey, label: t('Actions', 'செயல்கள்'), align: 'center' as const },
  ];

  // Filter visible columns
  const visibleColumns = columns.filter(col => visibleCols[col.key]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              {visibleColumns.map((col) => (
                <td
                  key={`${item.id}-${col.key}`}
                  className={`px-4 py-3 whitespace-nowrap text-sm ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {getCellContent(item, col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
