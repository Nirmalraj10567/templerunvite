import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import propertyService, { Asset, AssetLog } from '@/services/propertyService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Eye, Package, IndianRupee, Box, User, Phone, FileText, History, X, Loader2 } from 'lucide-react';
import { cn, formFieldStyles } from '@/styles/formStyles';

export default function AssetManagementPage() {
  const { token } = useAuth();
  const { language } = useLanguage();

  const enableHistoryEdit = true;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, converted: 0, totalValue: 0 });

  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);
  const [logs, setLogs] = useState<AssetLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [editLogOpen, setEditLogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<AssetLog | null>(null);
  const [editLogAction, setEditLogAction] = useState('');
  const [editLogUsedQty, setEditLogUsedQty] = useState('');
  const [editLogSoldQty, setEditLogSoldQty] = useState('');
  const [editLogPriceUnit, setEditLogPriceUnit] = useState('');
  const [editLogConvertedValue, setEditLogConvertedValue] = useState('');
  const [editLogIncomeEntryId, setEditLogIncomeEntryId] = useState('');
  const [convertOpen, setConvertOpen] = useState(false);
  const [usedQty, setUsedQty] = useState('');
  const [forSellQty, setForSellQty] = useState('');
  const [convertPrice, setConvertPrice] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    details: '',
    value: '',
    quantity: '',
    asset_source: 'donation',
    donor_name: '',
    donor_contact: '',
  });

  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

  useEffect(() => {
    fetchAssets();
    fetchStats();
  }, [search]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await propertyService.getAssets(1, 100, search);
      setAssets(data);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLog = (log: AssetLog) => {
    setEditingLog(log);
    setEditLogAction(log.action || '');
    const detailsObj = safeParseLogDetails(log.details) || {};

    const usedQtyVal = detailsObj.used_qty ?? detailsObj.usedQty;
    const soldQtyVal = detailsObj.for_sell_qty ?? detailsObj.forSellQty;
    const priceUnitVal =
      detailsObj.convert_price ??
      detailsObj.convertPrice ??
      detailsObj.price ??
      detailsObj.price_per_unit ??
      detailsObj.convert_price_per_unit;
    const convertedValueVal = detailsObj.converted_value ?? detailsObj.convertedValue ?? detailsObj.convertValue;
    setEditLogUsedQty(usedQtyVal != null ? String(usedQtyVal) : '');
    setEditLogSoldQty(soldQtyVal != null ? String(soldQtyVal) : '');
    setEditLogPriceUnit(priceUnitVal != null ? String(priceUnitVal) : '');
    setEditLogConvertedValue(convertedValueVal != null ? String(convertedValueVal) : '');
    setEditLogOpen(true);
  };

  const handleCancelEditLog = () => {
    setEditingLog(null);
    setEditLogAction('');
    setEditLogUsedQty('');
    setEditLogSoldQty('');
    setEditLogPriceUnit('');
    setEditLogConvertedValue('');
    setEditLogOpen(false);
  };

  const handleSaveLog = async () => {
    if (!editingLog || !viewAsset) return;
    try {
      const payloadDetails: Record<string, any> = {};

      if (editLogUsedQty !== '') payloadDetails.used_qty = Number(editLogUsedQty);
      if (editLogSoldQty !== '') payloadDetails.for_sell_qty = Number(editLogSoldQty);
      if (editLogPriceUnit !== '') payloadDetails.convert_price = Number(editLogPriceUnit);
      if (editLogConvertedValue !== '') payloadDetails.converted_value = Number(editLogConvertedValue);

      await propertyService.updateAssetLog(editingLog.id.toString(), {
        action: editLogAction,
        details: JSON.stringify(payloadDetails),
      });
      toast.success(t('History updated', 'வரலாறு புதுப்பிக்கப்பட்டது'));
      handleCancelEditLog();
      setEditLogOpen(false);
      const assetLogs = await propertyService.getAssetLogs(viewAsset.id.toString());
      setLogs(assetLogs);
      const updatedAsset = await propertyService.getAsset(viewAsset.id.toString());
      setViewAsset(updatedAsset);
      await fetchAssets();
      await fetchStats();
    } catch (error) {
      toast.error(t('Failed to update history', 'வரலாறு புதுப்பிக்க முடியவில்லை'));
    }
  };

  const handleDeleteLog = async (log: AssetLog) => {
    if (!viewAsset) return;
    if (!confirm(t('Delete this history entry?', 'இந்த வரலாற்றை நீக்கவா?'))) return;
    try {
      await propertyService.deleteAssetLog(log.id.toString());
      toast.success(t('History deleted', 'வரலாறு நீக்கப்பட்டது'));
      const assetLogs = await propertyService.getAssetLogs(viewAsset.id.toString());
      setLogs(assetLogs);
      const updatedAsset = await propertyService.getAsset(viewAsset.id.toString());
      setViewAsset(updatedAsset);
      await fetchAssets();
      await fetchStats();
    } catch (error) {
      toast.error(t('Failed to delete history', 'வரலாறு நீக்க முடியவில்லை'));
    }
  };

  const fetchStats = async () => {
    try {
      const data = await propertyService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assetData = {
        ...formData,
        value: parseFloat(formData.value) || 0,
        quantity: parseInt(formData.quantity) || 0,
      };

      if (editingAsset) {
        await propertyService.updateAsset(editingAsset.id.toString(), assetData);
        toast.success(t('Asset updated', 'சொத்து புதுப்பிக்கப்பட்டது'));
      } else {
        await propertyService.createAsset(assetData);
        toast.success(t('Asset created', 'சொத்து உருவாக்கப்பட்டது'));
      }
      setOpenDialog(false);
      fetchAssets();
      fetchStats();
      setFormData({ name: '', details: '', value: '', quantity: '', asset_source: 'donation', donor_name: '', donor_contact: '' });
    } catch (error) {
      toast.error(t('Failed to save', 'சேம்ப்க முடியவில்லை'));
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name || '',
      details: asset.details || '',
      value: asset.value?.toString() || '',
      quantity: asset.quantity?.toString() || '',
      asset_source: asset.asset_source || 'donation',
      donor_name: asset.donor_name || '',
      donor_contact: asset.donor_contact || '',
    });
    setOpenDialog(true);
  };

  const handleView = async (asset: Asset) => {
    setViewAsset(asset);
    setUsedQty('');
    setForSellQty('');
    setConvertPrice(asset.convert_price && asset.convert_price > 0 ? asset.convert_price.toString() : '');
    try {
      const assetLogs = await propertyService.getAssetLogs(asset.id.toString());
      setLogs(assetLogs);
      setLogsOpen(true);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleDelete = async (assetId: number) => {
    if (!confirm(t('Delete this asset?', 'இந்த சொத்தை நீக்கவா?'))) return;
    try {
      await propertyService.deleteAsset(assetId.toString());
      toast.success(t('Asset deleted', 'சொத்து நீக்கப்பட்டது'));
      fetchAssets();
      fetchStats();
    } catch (error) {
      toast.error(t('Failed to delete', 'நீக்க முடியவில்லை'));
    }
  };

  const handleConvertToCash = async () => {
    if (!viewAsset) return;
    try {
      const totalValue = (parseInt(forSellQty) || 0) * (parseFloat(convertPrice) || 0);
      const available = availableQty(viewAsset);
      const used = parseInt(usedQty) || 0;
      const forSell = parseInt(forSellQty) || 0;

      const usedQtyToSend = (viewAsset.used_qty || 0) + used;
      const forSellQtyToSend = (viewAsset.for_sell_qty || 0) + forSell;

      if (used + forSell > available) {
        toast.error(t('Insufficient quantity', 'அளவு போதாது'));
        return;
      }

      await propertyService.convertToCash(
        viewAsset.id.toString(),
        totalValue,
        usedQtyToSend,
        forSellQtyToSend,
        parseFloat(convertPrice) || 0
      );
      toast.success(t('Sold successfully', 'விற்கப்பட்டது'));
      setConvertOpen(false);
      setUsedQty('');
      setForSellQty('');
      setConvertPrice('');
      const updatedAsset = await propertyService.getAsset(viewAsset.id.toString());
      setViewAsset(updatedAsset);
      await Promise.all([fetchAssets(), fetchStats()]);
    } catch (error) {
      toast.error(t('Failed to sell', 'விற்க முடியவில்லை'));
    }
  };

  const handleSaveInventory = async () => {
    if (!viewAsset) {
      toast.error('No asset selected');
      return;
    }
    const used = parseInt(usedQty) || 0;
    const forSell = parseInt(forSellQty) || 0;

    const usedQtyToSend = (viewAsset.used_qty || 0) + used;
    const forSellQtyToSend = (viewAsset.for_sell_qty || 0) + forSell;

    if (used === 0 && forSell === 0) {
      toast.error(t('Enter quantity', 'அளவு உள்ளிடவும்'));
      return;
    }

    const available = availableQty(viewAsset);
    if (used + forSell > available) {
      toast.error(t('Insufficient quantity', 'அளவு போதாது'));
      return;
    }

    try {
      console.log('Saving inventory:', viewAsset.id, used, forSell);
      const result = await propertyService.updateAssetQty(
        viewAsset.id.toString(),
        usedQtyToSend,
        forSellQtyToSend
      );
      console.log('Result:', result);
      toast.success(t('Inventory saved', 'சத்கம் சேமிக்கப்பட்டது'));
      setUsedQty('');
      setForSellQty('');
      const [updatedAsset, assetLogs] = await Promise.all([
        propertyService.getAsset(viewAsset.id.toString()),
        propertyService.getAssetLogs(viewAsset.id.toString()),
      ]);
      setViewAsset(updatedAsset);
      setLogs(assetLogs);
      await Promise.all([fetchAssets(), fetchStats()]);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(t('Failed to save', 'சேம்ப்க முடியவில்லை') + ': ' + (error?.message || ''));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      converted: 'bg-blue-100 text-blue-800',
      disposed: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      active: t('Available', 'கிடைக்கிறது'),
      converted: t('Sold', 'விற்கப்பட்டது'),
      disposed: t('Disposed', 'நீக்கியது'),
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const parseQtyFromDetails = (details?: string): number | null => {
    if (!details) return null;
    const qtyMatch = details.match(/\bQty:\s*([0-9]+(?:\.[0-9]+)?)\s*(?:x\s*([0-9]+(?:\.[0-9]+)?))?/i);
    if (!qtyMatch) return null;
    const a = Number(qtyMatch[1]);
    const b = qtyMatch[2] != null ? Number(qtyMatch[2]) : 1;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return a * b;
  };

  const getAssetTotalQty = (asset: Asset): number => {
    const backendQty = Number(asset.quantity);
    const parsedQty = parseQtyFromDetails(asset.details);
    if (Number.isFinite(backendQty) && backendQty > 0) {
      if (parsedQty != null && parsedQty > backendQty) return parsedQty;
      return backendQty;
    }
    return parsedQty ?? 0;
  };

  const formatDetailsForDisplay = (details?: string): string => {
    if (!details) return '-';
    const parsedQty = parseQtyFromDetails(details);
    if (parsedQty == null) return details;
    return details.replace(/\bQty:\s*[0-9]+(?:\.[0-9]+)?\s*(?:x\s*[0-9]+(?:\.[0-9]+)?)?/i, `Qty: ${parsedQty}`);
  };

  const formatDonationProductQtySummary = (details: string): string => {
    const parts = details.split(' | ');
    const product = parts.find((p) => p.startsWith('Product:'));
    const qty = parts.find((p) => p.startsWith('Qty:'));
    if (!product && !qty) return formatDetailsForDisplay(details);
    const parsedQty = parseQtyFromDetails(details);
    const qtyText = parsedQty != null ? `Qty: ${parsedQty}` : qty;
    return [product, qtyText].filter(Boolean).join(' | ');
  };

  const safeParseLogDetails = (details: unknown): Record<string, any> | null => {
    if (details == null) return null;
    if (typeof details === 'object') return details as Record<string, any>;
    if (typeof details !== 'string') return null;
    const trimmed = details.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, any>;
      return null;
    } catch {
      return null;
    }
  };

  const availableQty = (asset: Asset) => {
    const total = getAssetTotalQty(asset);
    const used = asset.used_qty || 0;
    const forSell = asset.for_sell_qty || 0;
    return total - used - forSell;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('Asset Management', 'சொத்து மேலாண்மை')}</h1>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <Box className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-blue-700">{t('Total Assets', 'மொத்த சொத்துகள்')}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-green-700">{t('Available', 'கிடைக்கிறது')}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <div className="text-2xl font-bold text-orange-600">{stats.converted}</div>
            <div className="text-sm text-orange-700">{t('Sold', 'விற்கப்பட்டது')}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalValue)}</div>
            <div className="text-sm text-purple-700">{t('Total Value', 'மொத்த மதிப்பு')}</div>
          </CardContent>
        </Card>
      </div>

     {/* Search */}
<div className="flex gap-2 mb-4 w-full">
  <Input
    placeholder={t('Search assets...', 'சொத்துகள் தேட்க...')}
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full"
  />
  <Button variant="outline" onClick={fetchAssets}>
    <Search className="h-4 w-4" />
  </Button>
</div>
      {/* Assets Table */}
      <Card>
        <Table>
         <TableHeader className={cn(formFieldStyles.moneyDonationList.logsTable.thead, "bg-[#FDEBD0]")}>
             <TableRow  className="whitespace-nowrap">
              <TableHead>{t('Name', 'பெயர்')}</TableHead>
              <TableHead>{t('Details', 'விவரங்கள்')}</TableHead>
              <TableHead>{t('Qty', 'அளவு')}</TableHead>
              <TableHead>{t('Price', 'விலை')}</TableHead>
              <TableHead>{t('Total Value', 'மொத்த மதிப்பு')}</TableHead>
              <TableHead>{t('Used', 'பயன்படுத்திய')}</TableHead>
              <TableHead>{t('For Sell', 'விற்க')}</TableHead>
              <TableHead>{t('Available', 'கிடைக்கிறது')}</TableHead>
              <TableHead>{t('Status', 'நிலை')}</TableHead>

            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
               <TableRow  className="whitespace-nowrap">
                <TableCell colSpan={9} className="text-center py-8">
                  <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">{t('Loading...', 'ஏற்றுகிறது...')}</p>
                </TableCell>
              </TableRow>
            ) : assets.length === 0 ? (
               <TableRow  className="whitespace-nowrap">
                <TableCell colSpan={9} className="text-center py-8">
                  {t('No assets found', 'சொத்துகள் இல்லை')}
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div className="font-medium">{asset.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{asset.asset_source || '-'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-[200px] truncate" title={asset.details}>
                      {asset.details ? (
                        asset.details.includes('Product:') && asset.details.includes('| Qty:')
                          ? formatDonationProductQtySummary(asset.details)
                          : formatDetailsForDisplay(asset.details)
                      ) : '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold">{getAssetTotalQty(asset)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatCurrency(asset.value || 0)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-purple-700">
                      {formatCurrency(getAssetTotalQty(asset) * (asset.value || 0))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-red-600">{asset.used_qty || 0}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-orange-600">{asset.for_sell_qty || 0}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-green-600 font-bold">{availableQty(asset)}</div>
                  </TableCell>
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? t('Edit Asset', 'சொத்து திருத்து') : t('Add New Asset', 'புதிய சொத்து சேர்க்க')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Box className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">{t('Basic Info', 'அடிப்படை தகவல்')}</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('Name', 'பெயர்')} *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder={t('Enter asset name', 'சொத்து பெயர் உள்ளிடவும்')}
                />
              </div>
            </div>

            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">{t('Inventory', 'சத்கம்')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('Quantity', 'அளவு')}</label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('Value', 'மதிப்பு (₹)')}</label>
                  <Input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">{t('Source Details', 'ஆதார விவரங்கள்')}</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('Source', 'ஆதாரம்')}</label>
                <select
                  className="w-full p-2 border rounded bg-white"
                  value={formData.asset_source}
                  onChange={(e) => setFormData({ ...formData, asset_source: e.target.value })}
                >
                  <option value="donation">{t('Donation', 'தானம்')}</option>
                  <option value="purchase">{t('Purchase', 'வாங்கியது')}</option>
                  <option value="other">{t('Other', 'மற்றவை')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('Name', 'பெயர்')}</label>
                  <Input
                    value={formData.donor_name}
                    onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                    placeholder={t('Donor name', 'தானதரகர் பெயர்')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('Phone', 'தொடர்பு')}</label>
                  <Input
                    value={formData.donor_contact}
                    onChange={(e) => setFormData({ ...formData, donor_contact: e.target.value })}
                    placeholder={t('Phone number', 'தொடர்பு எண்')}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{t('Details', 'விவரங்கள்')}</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder={t('Additional details...', 'கூடுதல் விவரங்கள்...')}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                {t('Cancel', 'ரத்து')}
              </Button>
              <Button type="submit">
                {t('Save Asset', 'சேம்ப்க')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              {viewAsset?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Inventory Status */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-700">{t('Inventory Status', 'சத்கம் நிலை')}</span>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-3">
                <div className="bg-white p-2 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{viewAsset ? getAssetTotalQty(viewAsset) : 0}</div>
                  <div className="text-xs text-gray-500">{t('Total', 'மொத்தம்')}</div>
                </div>
                <div className="bg-white p-2 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-500">{viewAsset?.used_qty || 0}</div>
                  <div className="text-xs text-gray-500">{t('Used', 'பயன்படுத்திய')}</div>
                </div>
                <div className="bg-white p-2 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-500">{viewAsset?.for_sell_qty || 0}</div>
                  <div className="text-xs text-gray-500">{t('Sold', 'விற்ற')}</div>
                </div>
                <div className="bg-white p-2 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{availableQty(viewAsset || {} as Asset)}</div>
                  <div className="text-xs text-gray-500">{t('Available', 'கிடைக்கிறது')}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-white p-3 rounded-lg">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">{t('Usage', 'பயன்பாடு')}</span>
                  <span className="font-medium">
                    {viewAsset && getAssetTotalQty(viewAsset) ? Math.round(((viewAsset.used_qty || 0) + (viewAsset.for_sell_qty || 0)) / getAssetTotalQty(viewAsset) * 100) : 0}%
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full"
                    style={{ width: `${viewAsset && getAssetTotalQty(viewAsset) ? Math.min(100, ((viewAsset.used_qty || 0) + (viewAsset.for_sell_qty || 0)) / getAssetTotalQty(viewAsset) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Sale Details - Visible only when sold */}
            {viewAsset?.status === 'converted' && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-purple-700">{t('Sale Details', 'விற்பனை விவரங்கள்')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                    <div className="text-lg font-bold text-purple-600">{viewAsset.for_sell_qty || 0}</div>
                    <div className="text-xs text-gray-500">{t('Qty Sold', 'விற்ற அளவு')}</div>
                  </div>
                  <div className="bg-white p-2 rounded-lg text-center shadow-sm">
                    <div className="text-lg font-bold text-emerald-600">{formatCurrency(viewAsset.convert_price || 0)}</div>
                    <div className="text-xs text-gray-500">{t('Price / Unit', 'விலை / அலகு')}</div>
                  </div>
                  <div className="bg-purple-100/50 p-3 rounded-lg text-center col-span-2 border border-purple-200">
                    <div className="text-xs text-purple-700 uppercase tracking-wider font-semibold mb-1">{t('Total Sale Revenue', 'மொத்த விற்பனை வருவாய்')}</div>
                    <div className="text-2xl font-black text-purple-800">
                      {formatCurrency((viewAsset.for_sell_qty || 0) * (viewAsset.convert_price || 0))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500">{t('Value', 'மதிப்பு')}</div>
                <div className="font-bold text-lg">{formatCurrency(viewAsset?.value || 0)}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-500">{t('Status', 'நிலை')}</div>
                <div className="mt-1">{viewAsset && getStatusBadge(viewAsset.status)}</div>
              </div>
              {viewAsset?.donor_name && (
                <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                  <div className="text-xs text-gray-500">{t('Donor', 'தானதரகர்')}</div>
                  <div className="font-medium">{viewAsset.donor_name}</div>
                  {viewAsset.donor_contact && (
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {viewAsset.donor_contact}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {viewAsset?.status === 'active' && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-700">{t('Update Inventory', 'சத்கம் புதுப்பி')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('Used Qty', 'பயன்படுத்திய அளவு')}</label>
                    <Input
                      type="number"
                      value={usedQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const available = availableQty(viewAsset || {} as Asset);
                        const other = parseInt(forSellQty) || 0;
                        if (val + other > available) {
                          setUsedQty(Math.max(0, available - other).toString());
                        } else {
                          setUsedQty(e.target.value);
                        }
                      }}
                      placeholder="0"
                      min="0"
                      max={availableQty(viewAsset)}
                      className="border-red-200 focus:border-red-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('For Sell Qty', 'விற்க அளவு')}</label>
                    <Input
                      type="number"
                      value={forSellQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const available = availableQty(viewAsset || {} as Asset);
                        const other = parseInt(usedQty) || 0;
                        if (val + other > available) {
                          setForSellQty(Math.max(0, available - other).toString());
                        } else {
                          setForSellQty(e.target.value);
                        }
                      }}
                      placeholder="0"
                      min="0"
                      max={availableQty(viewAsset)}
                      className="border-orange-200 focus:border-orange-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => { console.log('Save clicked'); handleSaveInventory(); }} className="border-green-300 text-green-700 hover:bg-green-50">
                    <Package className="h-4 w-4 mr-1" />
                    {t('Save Inventory', 'சத்கம் சேமி')}
                  </Button>
                  <Button onClick={() => setConvertOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                    <IndianRupee className="h-4 w-4 mr-1" />
                    {t('Sell', 'விற்க')}
                  </Button>
                </div>
              </div>
            )}

            {/* Convert to Cash Dialog */}
            {convertOpen && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-purple-700">{t('Sell Item', 'உருப்படம் விற்க')}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="hidden">
                    <label className="block text-xs text-gray-600 mb-1">{t('Used', 'பயன்படுத்திய')}</label>
                    <Input
                      type="number"
                      value={usedQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const available = availableQty(viewAsset || {} as Asset);
                        const other = parseInt(forSellQty) || 0;
                        if (val + other > available) {
                          setUsedQty(Math.max(0, available - other).toString());
                        } else {
                          setUsedQty(e.target.value);
                        }
                      }}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('For Sell', 'விற்க')}</label>
                    <Input
                      type="number"
                      value={forSellQty}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const available = availableQty(viewAsset || {} as Asset);
                        const other = parseInt(usedQty) || 0;
                        if (val + other > available) {
                          setForSellQty(Math.max(0, available - other).toString());
                        } else {
                          setForSellQty(e.target.value);
                        }
                      }}
                      placeholder="0"
                      min="0"
                      max={availableQty(viewAsset)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">{t('Price/Unit (₹)', 'விலை/அலகு')}</label>
                    <Input
                      type="number"
                      value={convertPrice}
                      onChange={(e) => setConvertPrice(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="bg-white p-2 rounded-lg text-center mb-3">
                  <div className="text-xs text-gray-500">{t('Total Amount', 'மொத்த தொகை')}</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency((parseInt(forSellQty) || 0) * (parseFloat(convertPrice) || 0))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setConvertOpen(false)} className="flex-1">
                    <X className="h-4 w-4 mr-1" />
                    {t('Cancel', 'ரத்து')}
                  </Button>
                  <Button onClick={handleConvertToCash} className="flex-1 bg-green-600 hover:bg-green-700">
                    <IndianRupee className="h-4 w-4 mr-1" />
                    {t('Confirm Sale', 'விற்க உறுதிப்படுத்து')}
                  </Button>
                </div>
              </div>
            )}

            {/* Details */}
            {viewAsset?.details && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600">{t('Details', 'விவரங்கள்')}</span>
                </div>
                <div className="text-sm">
                  {viewAsset.details ? (
                    viewAsset.details.includes('Product:') && viewAsset.details.includes('| Qty:')
                      ? formatDonationProductQtySummary(viewAsset.details)
                      : formatDetailsForDisplay(viewAsset.details)
                  ) : '-'}
                </div>
              </div>
            )}

            {/* History */}
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-3 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <History className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">{t('History', 'வரலாறு')}</span>
              </div>
              {logs.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-2">{t('No history', 'வரலாறு இல்லை')}</div>
              ) : (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {[...logs]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 10)
                    .map((log, idx, arr) => {
                      const detailsObj = safeParseLogDetails(log.details);
                      const older = arr[idx + 1];
                      const olderObj = older ? safeParseLogDetails(older.details) : null;

                      const isEditingThisLog = false; // modal handles editing, not inline

                      const usedTotal = detailsObj && detailsObj.used_qty != null ? Number(detailsObj.used_qty) : null;
                      const soldTotal = detailsObj && detailsObj.for_sell_qty != null ? Number(detailsObj.for_sell_qty) : null;
                      const usedOlder = olderObj && olderObj.used_qty != null ? Number(olderObj.used_qty) : 0;
                      const soldOlder = olderObj && olderObj.for_sell_qty != null ? Number(olderObj.for_sell_qty) : 0;

                      const usedDelta = usedTotal == null || !Number.isFinite(usedTotal) ? null : usedTotal - (Number.isFinite(usedOlder) ? usedOlder : 0);
                      const soldDelta = soldTotal == null || !Number.isFinite(soldTotal) ? null : soldTotal - (Number.isFinite(soldOlder) ? soldOlder : 0);

                      const priceUnitRaw =
                        detailsObj?.convert_price ??
                        detailsObj?.convertPrice ??
                        detailsObj?.price ??
                        detailsObj?.price_per_unit ??
                        detailsObj?.convert_price_per_unit;
                      const priceUnit = priceUnitRaw != null && Number.isFinite(Number(priceUnitRaw)) ? Number(priceUnitRaw) : null;

                      return (
                        <div key={log.id} className="text-xs bg-white p-2 rounded border">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium capitalize">
                              {(log.action || '').replace(/_/g, ' ')}
                            </div>
                            {enableHistoryEdit && (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditLog(log)}
                                  className="h-7 px-2 text-green-700"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteLog(log)}
                                  className="h-7 px-2 text-red-600"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <div className="text-gray-500 flex flex-wrap gap-x-2 gap-y-1 items-center">
                              {usedTotal != null && Number.isFinite(usedTotal) && (
                                <span className="text-red-600">
                                  Used{usedDelta != null && usedDelta !== 0 ? ' +' + usedDelta : ''} (Total: {usedTotal})
                                </span>
                              )}
                              {soldTotal != null && Number.isFinite(soldTotal) && (
                                <span className="text-orange-600">
                                  Sold{soldDelta != null && soldDelta !== 0 ? ' +' + soldDelta : ''} (Total: {soldTotal})
                                </span>
                              )}
                              {priceUnit != null && (
                                <span className="text-emerald-700">Price/Unit: {formatCurrency(priceUnit)}</span>
                              )}
                              <span className="ml-auto">{new Date(log.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit History Dialog */}
      <Dialog open={editLogOpen} onOpenChange={setEditLogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit History', 'வரலாறு திருத்து')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {!(editLogAction === 'convert_to_cash' || editLogAction === 'Convert To Cash') && (
              <div>
                <label className="block text-sm font-medium mb-1">{t('Action', 'செயல்')}</label>
                <Input value={editLogAction} onChange={(e) => setEditLogAction(e.target.value)} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2" key={editingLog?.id || 'edit-form'}>
              {!(editLogAction === 'convert_to_cash' || editLogAction === 'Convert To Cash') && (
                <div key="used-qty">
                  <label className="block text-sm font-medium mb-1">{t('Used Qty', 'பயன்படுத்திய அளவு')}</label>
                  <Input type="text" inputMode="numeric" value={editLogUsedQty} onChange={(e) => setEditLogUsedQty(e.target.value)} />
                </div>
              )}
              {!(editLogAction === 'update_qty' || editLogAction === 'Update Qty') && (
                <>
                  <div key="sold-qty">
                    <label className="block text-sm font-medium mb-1">{t('Sold Qty', 'விற்ற அளவு')}</label>
                    <Input type="text" inputMode="numeric" value={editLogSoldQty} onChange={(e) => {
                      const newSoldQty = e.target.value;
                      setEditLogSoldQty(newSoldQty);
                      const soldNum = Number(newSoldQty);
                      const priceNum = Number(editLogPriceUnit);
                      if (!isNaN(soldNum) && !isNaN(priceNum) && soldNum > 0 && priceNum > 0) {
                        setEditLogConvertedValue(String(soldNum * priceNum));
                      }
                    }} />
                  </div>
                  <div key="price-unit">
                    <label className="block text-sm font-medium mb-1">{t('Price / Unit (₹)', 'விலை / அலகு (₹)')}</label>
                    <Input type="text" inputMode="numeric" value={editLogPriceUnit} onChange={(e) => {
                      const newPriceUnit = e.target.value;
                      setEditLogPriceUnit(newPriceUnit);
                      const soldNum = Number(editLogSoldQty);
                      const priceNum = Number(newPriceUnit);
                      if (!isNaN(soldNum) && !isNaN(priceNum) && soldNum > 0 && priceNum > 0) {
                        setEditLogConvertedValue(String(soldNum * priceNum));
                      }
                    }} />
                  </div>
                  <div key="converted-value">
                    <label className="block text-sm font-medium mb-1">{t('Converted Value', 'மாற்றிய மதிப்பு')}</label>
                    <Input type="text" inputMode="numeric" value={editLogConvertedValue} onChange={(e) => setEditLogConvertedValue(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelEditLog}
              >
                {t('Cancel', 'ரத்து')}
              </Button>
              <Button onClick={handleSaveLog}>{t('Save', 'சேமி')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}