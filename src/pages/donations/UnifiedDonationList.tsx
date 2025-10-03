import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { moneyDonationService, MoneyDonationItem } from '@/services/moneyDonationService';
import { donationService, DonationItem } from '@/services/donationService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/styles/formStyles';

interface UnifiedDonationItem {
  id: number;
  type: 'money' | 'product';
  registerNo: string;
  date: string;
  name: string;
  amount?: number;
  product?: string;
  quantity?: number;
  unit?: string;
}

export default function UnifiedDonationList() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  
  const [moneyDonations, setMoneyDonations] = useState<MoneyDonationItem[]>([]);
  const [productDonations, setProductDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [donationType, setDonationType] = useState<'all' | 'money' | 'product'>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const t = (en: string, ta: string) => (language === 'english' ? en : ta);

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        setLoading(true);
        const [moneyData, productData] = await Promise.all([
          moneyDonationService.getMoneyDonations(),
          donationService.getDonations()
        ]);
        setMoneyDonations(moneyData);
        setProductDonations(productData);
      } catch (error) {
        console.error('Error fetching donations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, [token]);

  const unifiedDonations = useMemo<UnifiedDonationItem[]>(() => {
    const moneyItems: UnifiedDonationItem[] = moneyDonations.map(item => ({
      id: item.id,
      type: 'money' as const,
      registerNo: item.registerNo,
      date: item.date,
      name: item.name,
      amount: parseFloat(item.amount.toString())
    }));

    const productItems: UnifiedDonationItem[] = productDonations.map(item => ({
      id: item.id,
      type: 'product' as const,
      registerNo: item.registerNo,
      date: item.date,
      name: item.name,
      product: item.product,
      quantity: item.quantity,
      unit: item.unit
    }));

    return [...moneyItems, ...productItems].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [moneyDonations, productDonations]);

  const filteredDonations = useMemo(() => {
    return unifiedDonations.filter(donation => {
      // Filter by search term
      const matchesSearch = 
        donation.registerNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        donation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (donation.type === 'money' && donation.amount?.toString().includes(searchTerm)) ||
        (donation.type === 'product' && 
          (donation.product?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           donation.quantity?.toString().includes(searchTerm)));
      
      // Filter by donation type
      const matchesType = donationType === 'all' || donation.type === donationType;
      
      // Filter by date range
      const donationDate = new Date(donation.date);
      const fromDate = dateRange.from ? new Date(dateRange.from) : null;
      const toDate = dateRange.to ? new Date(dateRange.to) : null;
      
      let matchesDate = true;
      if (fromDate) {
        fromDate.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && donationDate >= fromDate;
      }
      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && donationDate <= toDate;
      }
      
      return matchesSearch && matchesType && matchesDate;
    });
  }, [unifiedDonations, searchTerm, donationType, dateRange]);

  const handleViewDetails = (donation: UnifiedDonationItem) => {
    if (donation.type === 'money') {
      navigate(`/donations/money/${donation.id}`);
    } else {
      navigate(`/donations/product/${donation.id}`);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (e) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('Unified Donations', 'ஒருங்கிணைந்த நன்கொடைகள்')}</h1>
          <p className="text-muted-foreground">
            {t('View and manage all donations', 'அனைத்து நன்கொடைகளையும் காண்க மற்றும் நிர்வகிக்கவும்')}
          </p>
        </div>
        <Button onClick={() => navigate('/donations/new')}>
          {t('+ Add New Donation', '+ புதிய நன்கொடையைச் சேர்க்கவும்')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>{t('Donation Records', 'நன்கொடை பதிவுகள்')}</CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="donationType" className="whitespace-nowrap">
                  {t('Type:', 'வகை:')}
                </Label>
                <select
                  id="donationType"
                  className="border rounded p-2 text-sm"
                  value={donationType}
                  onChange={(e) => setDonationType(e.target.value as 'all' | 'money' | 'product')}
                >
                  <option value="all">{t('All', 'அனைத்தும்')}</option>
                  <option value="money">{t('Money', 'பணம்')}</option>
                  <option value="product">{t('Product', 'பொருள்')}</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="search" className="whitespace-nowrap">
                  {t('Search:', 'தேடல்:')}
                </Label>
                <Input
                  id="search"
                  placeholder={t('Search...', 'தேடவும்...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-auto"
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="fromDate" className="whitespace-nowrap">
                {t('From:', 'இருந்து:')}
              </Label>
              <Input
                id="fromDate"
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                className="w-full md:w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="toDate" className="whitespace-nowrap">
                {t('To:', 'வரை:')}
              </Label>
              <Input
                id="toDate"
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                className="w-full md:w-auto"
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setDateRange({ from: '', to: '' })}
              className="whitespace-nowrap"
            >
              {t('Clear Dates', 'தேதிகளை அழி')}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left rtl:text-right text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">{t('Type', 'வகை')}</th>
                    <th className="px-6 py-3">{t('Register No', 'பதிவு எண்')}</th>
                    <th className="px-6 py-3">{t('Date', 'தேதி')}</th>
                    <th className="px-6 py-3">{t('Name', 'பெயர்')}</th>
                    <th className="px-6 py-3">{t('Details', 'விவரங்கள்')}</th>
                    <th className="px-6 py-3">{t('Actions', 'செயல்கள்')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonations.length > 0 ? (
                    filteredDonations.map((donation) => (
                      <tr key={`${donation.type}-${donation.id}`} className="bg-white border-b hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-1 text-xs font-medium rounded-full",
                            donation.type === 'money' 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-green-100 text-green-800"
                          )}>
                            {donation.type === 'money' 
                              ? t('Money', 'பணம்') 
                              : t('Product', 'பொருள்')}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                          {donation.registerNo}
                        </td>
                        <td className="px-6 py-4">
                          {formatDate(donation.date)}
                        </td>
                        <td className="px-6 py-4">
                          {donation.name}
                        </td>
                        <td className="px-6 py-4">
                          {donation.type === 'money' ? (
                            <span className="font-medium">
                              ₹{donation.amount?.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <div>
                              <div>{donation.product}</div>
                              <div className="text-sm text-gray-500">
                                {donation.quantity} {donation.unit}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(donation)}
                          >
                            {t('View', 'காட்டு')}
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        {t('No donations found', 'நன்கொடைகள் எதுவும் கிடைக்கவில்லை')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
