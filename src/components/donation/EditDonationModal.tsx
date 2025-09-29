import React from 'react';
import { DonationItem, DonationFormData } from '@/types/donation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface EditDonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DonationItem | null;
  onSave: (data: DonationFormData) => Promise<void>;
  t: (en: string, ta: string) => string;
}

export const EditDonationModal: React.FC<EditDonationModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave,
  t,
}) => {
  const [formData, setFormData] = React.useState<DonationFormData>({
    product: '',
    quantity: '',
    description: '',
    category: 'General',
    donorName: '',
    donorContact: '',
    donationDate: new Date().toISOString().split('T')[0],
    notes: '',
    status: 'available',
  });
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (item) {
      setFormData({
        product: item.product_name || '',
        quantity: item.quantity ?? '',
        description: item.description || '',
        category: item.category || 'General',
        donorName: item.donor_name || '',
        donorContact: item.donor_contact || '',
        donationDate: (item.donation_date || new Date().toISOString().split('T')[0]).slice(0, 10),
        notes: item.notes || '',
        status: item.status || 'available',
      });
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('Edit Donation', 'நன்கொடையைத் திருத்து')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="product">{t('Product', 'பொருள்')}</Label>
            <Input
              id="product"
              name="product"
              value={formData.product}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="quantity">{t('Quantity', 'அளவு')}</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t('Category', 'வகை')}</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleSelectChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('Select category', 'வகையைத் தேர்ந்தெடுக்கவும்')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General">{t('General', 'பொது')}</SelectItem>
                <SelectItem value="Food">{t('Food', 'உணவு')}</SelectItem>
                <SelectItem value="Clothing">{t('Clothing', 'உடை')}</SelectItem>
                <SelectItem value="Money">{t('Money', 'பணம்')}</SelectItem>
                <SelectItem value="Other">{t('Other', 'மற்றவை')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="donorName">{t('Donor Name', 'நன்கொடையாளர் பெயர்')}</Label>
            <Input
              id="donorName"
              name="donorName"
              value={formData.donorName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="donorContact">{t('Donor Contact', 'தொடர்பு எண்')}</Label>
            <Input
              id="donorContact"
              name="donorContact"
              value={formData.donorContact}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="donationDate">{t('Donation Date', 'நன்கொடை தேதி')}</Label>
            <Input
              id="donationDate"
              name="donationDate"
              type="date"
              value={formData.donationDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">{t('Description', 'விளக்கம்')}</Label>
            <Input
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">{t('Notes', 'குறிப்புகள்')}</Label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t('Status', 'நிலை')}</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleSelectChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('Select status', 'நிலையைத் தேர்ந்தெடுக்கவும்')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">{t('Available', 'கிடைக்கிறது')}</SelectItem>
                <SelectItem value="distributed">{t('Distributed', 'விநியோகிக்கப்பட்டது')}</SelectItem>
                <SelectItem value="expired">{t('Expired', 'காலாவதியானது')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('Cancel', 'ரத்து செய்க')}
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? t('Saving...', 'சேமிக்கிறது...') : t('Save Changes', 'மாற்றங்களை சேமி')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
