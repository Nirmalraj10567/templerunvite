import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Plus, Search, Edit, Trash2, Eye, RefreshCw, Package, DollarSign, Clock } from 'lucide-react';

export default function AssetManagementPage() {
  const { token } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, converted: 0, totalValue: 0 });
  
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewAsset, setViewAsset] = useState<Asset | null>(null);
  const [logs, setLogs] = useState<AssetLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertValue, setConvertValue] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    details: '',
    value: '',
    asset_source: 'donation',
    donor_name: '',
    donor_contact: '',
  });

  const t = (en: string, ta: string) => (language === 'english' ? en : ta);

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
      setFormData({ name: '', details: '', value: '', asset_source: 'donation', donor_name: '', donor_contact: '' });
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
      asset_source: asset.asset_source || 'donation',
      donor_name: asset.donor_name || '',
      donor_contact: asset.donor_contact || '',
    });
    setOpenDialog(true);
  };

  const handleView = async (asset: Asset) => {
    setViewAsset(asset);
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
      await propertyService.convertToCash(viewAsset.id.toString(), parseFloat(convertValue) || 0);
      toast.success(t('Converted to cash', 'பணமாக மாற்றப்பட்டது'));
      setConvertOpen(false);
      setConvertValue('');
      fetchAssets();
      fetchStats();
    } catch (error) {
      toast.error(t('Failed to convert', 'மாற்ற முடியவில்லை'));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      converted: 'bg-blue-100 text-blue-800',
      disposed: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      active: t('Active', 'சுறுசுழ'),
      converted: t('Converted', 'மாறியது'),
      disposed: t('Disposed', 'நீக்கியது'),
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('Asset Management', 'சொத்து மேலாண்மை')}</h1>
        <Button onClick={() => { setEditingAsset(null); setOpenDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          {t('Add Asset', 'சொத்து சேர்க்க')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">{t('Total Assets', 'மொத்த சொத்துகள்')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-500">{t('Active', 'சுறுசுழ')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.converted}</div>
            <div className="text-sm text-gray-500">{t('Converted', 'மாறியது')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalValue)}</div>
            <div className="text-sm text-gray-500">{t('Total Value', 'மொத்த மதிப்ப���')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder={t('Search assets...', 'சொத்துகள் தேட்க...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <Button variant="outline" onClick={fetchAssets}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {/* Assets Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Name', 'பெயர்')}</TableHead>
              <TableHead>{t('Value', 'மதிப்பு')}</TableHead>
              <TableHead>{t('Source', 'மூலம்')}</TableHead>
              <TableHead>{t('Donor', 'தரகர்')}</TableHead>
              <TableHead>{t('Status', 'நிலை')}</TableHead>
              <TableHead>{t('Actions', 'செயல்கள்')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {t('Loading...', 'ஏற்றுகிறது...')}
                </TableCell>
              </TableRow>
            ) : assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  {t('No assets found', 'சொத்துகள் இல்லை')}
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{formatCurrency(asset.value)}</TableCell>
                  <TableCell className="capitalize">{asset.asset_source || '-'}</TableCell>
                  <TableCell>{asset.donor_name || '-'}</TableCell>
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleView(asset)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(asset)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(asset.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAsset ? t('Edit Asset', 'சொத்து திருத்து') : t('Add Asset', 'சொத்து சேர்க்க')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('Name', 'பெயர்')} *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('Value', 'மதிப்பு')}</label>
              <Input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('Source', 'மூலம்')}</label>
              <select
                className="w-full p-2 border rounded"
                value={formData.asset_source}
                onChange={(e) => setFormData({ ...formData, asset_source: e.target.value })}
              >
                <option value="donation">{t('Donation', 'தானம்')}</option>
                <option value="purchase">{t('Purchase', 'வாங்கியது')}</option>
                <option value="other">{t('Other', 'மற்றவை')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('Donor Name', 'தரகர் பெயர்')}</label>
              <Input
                value={formData.donor_name}
                onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('Donor Contact', 'தரகர் தொடர்பு')}</label>
              <Input
                value={formData.donor_contact}
                onChange={(e) => setFormData({ ...formData, donor_contact: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('Details', 'விவரங்கள்')}</label>
              <textarea
                className="w-full p-2 border rounded"
                rows={3}
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                {t('Cancel', 'ரத்து')}
              </Button>
              <Button type="submit">
                {t('Save', 'சேம்ப்க')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View/Convert Dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewAsset?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">{t('Value', 'மதிப்பு')}</div>
                <div className="font-medium">{formatCurrency(viewAsset?.value || 0)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t('Status', 'நிலை')}</div>
                <div>{viewAsset && getStatusBadge(viewAsset.status)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t('Source', 'மூலம்')}</div>
                <div className="capitalize">{viewAsset?.asset_source || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t('Donor', 'தரகர்')}</div>
                <div>{viewAsset?.donor_name || '-'}</div>
              </div>
            </div>
            {viewAsset?.details && (
              <div>
                <div className="text-sm text-gray-500">{t('Details', 'விவரங்கள்')}</div>
                <div>{viewAsset.details}</div>
              </div>
            )}
            {viewAsset?.status === 'active' && (
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder={t('Enter amount to convert', 'மாற்றத் தொகையை உள்ளிடவும்')}
                  value={convertValue}
                  onChange={(e) => setConvertValue(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => setConvertOpen(true)}>
                  <DollarSign className="h-4 w-4 mr-1" />
                  {t('Convert to Cash', 'பணமாக மாற்று')}
                </Button>
              </div>
            )}
            {convertOpen && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConvertOpen(false)}>
                  {t('Cancel', 'ரத்து')}
                </Button>
                <Button onClick={handleConvertToCash}>
                  {t('Confirm', 'உறுதிப்படுத்து')}
                </Button>
              </div>
            )}
            <div>
              <div className="text-sm font-medium mb-2">{t('Activity Logs', 'நடவடிக்கை பதிவுகள்')}</div>
              {logs.length === 0 ? (
                <div className="text-gray-500">{t('No logs', 'பதிவுகள் இல்லை')}</div>
              ) : (
                <div className="max-h-40 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="text-sm border-b py-1">
                      <span className="capitalize">{log.action}</span>
                      <span className="text-gray-500 ml-2">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}