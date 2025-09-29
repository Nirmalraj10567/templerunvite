import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ledgerService, LedgerEntry } from '@/services/ledgerService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

export default function LedgerEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { token } = useAuth();
  const { toast } = useToast();
  
  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);
  
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<LedgerEntry | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const hasLoaded = useRef(false);
  
  const [formData, setFormData] = useState<{
    date: string;
    name: string;
    type: 'credit' | 'debit';
    under: string;
    amount: string;
    remarks?: string;
  }>({
    date: '',
    name: '',
    type: 'credit',
    under: '',
    amount: '',
    remarks: ''
  });

  useEffect(() => {
    const loadData = async () => {
      if (!id || hasLoaded.current) return;
      
      try {
        setLoading(true);
        hasLoaded.current = true;
        
        // Load entry data and categories in parallel
        const [data, cats] = await Promise.all([
          ledgerService.getEntry(parseInt(id)),
          ledgerService.getCategories()
        ]);
        
        setEntry(data);
        setCategories(cats);
        setFormData({
          date: data.date.split('T')[0],
          name: data.name || '',
          type: data.type || 'credit',
          under: data.under || '',
          amount: data.amount.toString(),
          remarks: (data as any).remarks || ''
        });
      } catch (error) {
        console.error('Error loading data:', error);
        toast(t('Failed to load ledger entry', 'பதிவேட்டு உள்ளீட்டை ஏற்ற முடியவில்லை'), {
          variant: 'destructive'
        });
        navigate('/dashboard/ledger/list');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
    
    // Cleanup function to reset the ref when id changes
    return () => {
      hasLoaded.current = false;
    };
  }, [id]); // Only depend on id, remove other dependencies

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!entry) return;
      
      const updatedEntry = {
        ...entry,
        date: formData.date,
        name: formData.name,
        type: formData.type,
        under: formData.under,
        amount: parseFloat(formData.amount),
        remarks: formData.remarks
      };
      
      await ledgerService.updateEntry(updatedEntry);
      
      toast(t('Ledger entry updated', 'பதிவேட்டு உள்ளீடு புதுப்பிக்கப்பட்டது'), {
        variant: 'success'
      });
      
      navigate('/dashboard/ledger/list');
    } catch (error) {
      console.error('Error updating entry:', error);
      toast(t('Failed to update ledger entry', 'பதிவேட்டு உள்ளீட்டை புதுப்பிக்க முடியவில்லை'), {
        variant: 'destructive'
      });
    }
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSelectChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>{t('Loading...', 'ஏற்றுகிறது...')}</p>
        </div>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>{t('Entry not found', 'உள்ளீடு கிடைக்கவில்லை')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('Edit Ledger Entry', 'பதிவேட்டு உள்ளீட்டை திருத்து')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('Date', 'தேதி')}</Label>
                <Input 
                  type="date" 
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <Label>{t('Name', 'பெயர்')}</Label>
                <Input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div>
                <Label>{t('Type', 'வகை')}</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleSelectChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select type', 'வகையைத் தேர்ந்தெடுக்கவும்')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">{t('Credit', 'கடன்')}</SelectItem>
                    <SelectItem value="debit">{t('Debit', 'பற்று')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{t('Category', 'வகை')}</Label>
                <Select 
                  value={formData.under} 
                  onValueChange={(value) => handleSelectChange('under', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select category', 'வகையைத் தேர்ந்தெடுக்கவும்')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>{t('Amount', 'தொகை')}</Label>
                <Input 
                  type="number" 
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div>
              <Label>{t('Remarks', 'குறிப்புகள்')}</Label>
              <Input 
                type="text" 
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                type="button"
                onClick={() => navigate('/dashboard/ledger/list')}
              >
                {t('Cancel', 'ரத்து செய்')}
              </Button>
              <Button type="submit">
                {t('Save Changes', 'மாற்றங்களை சேமி')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
