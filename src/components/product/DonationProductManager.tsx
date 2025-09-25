import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { useState } from 'react';
import { useLanguage } from '@/lib/language';

export type DonationProduct = {
  id: number;
  value: string; // will mirror label
  label: string; // product name
  unit?: string;
};

export function DonationProductManager({
  products,
  setProducts,
}: {
  products: DonationProduct[];
  setProducts: React.Dispatch<React.SetStateAction<DonationProduct[]>>;
}) {
  const { language } = useLanguage();
  // Follow the same helper style used in pages: if language is 'english', show Tamil label (app-wide convention)
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editing, setEditing] = useState<DonationProduct | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<Pick<DonationProduct, 'label' | 'unit'>>({ label: '', unit: '' });

  const handleAdd = async () => {
    if (isLoading) return;
    const label = draft.label.trim();
    const unit = (draft.unit || '').trim();
    if (!label) return;
    if (products.some(p => p.label.toLowerCase() === label.toLowerCase())) return;
    try {
      setIsLoading(true);
      const resp = await axios.post<DonationProduct>(
        '/api/donation-products',
        { value: label, label, unit },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      setProducts(prev => [...prev, resp.data]);
      setDraft({ label: '', unit: '' });
      setIsAdding(false);
    } catch (e) {
      console.error('Add product failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (item: DonationProduct) => {
    if (isLoading) return;
    const label = item.label.trim();
    const unit = (item.unit || '').trim();
    if (!label) return;
    try {
      setIsLoading(true);
      const resp = await axios.put<DonationProduct>(
        `/api/donation-products/${item.id}`,
        { value: label, label, unit },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      setProducts(prev => prev.map(p => (p.id === item.id ? resp.data : p)));
      setEditing(null);
    } catch (e) {
      console.error('Update product failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      await axios.delete(`/api/donation-products/${id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error('Delete product failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{t('Manage Products', 'பொருள் மேலாண்மை')}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Manage Products', 'பொருள் மேலாண்மை')}</DialogTitle>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Name', 'பெயர்')}</TableHead>
                <TableHead>{t('Unit', 'அலகு')}</TableHead>
                <TableHead>{t('Actions', 'செயல்கள்')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                    {t('No products found. Add a new one below.', 'பொருட்கள் எதுவும் இல்லை. கீழே புதியதைச் சேர்க்கவும்.')}
                  </TableCell>
                </TableRow>
              ) : (
                products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {editing?.id === p.id ? (
                        <Input value={editing.label} onChange={e => setEditing({ ...editing, label: e.target.value })} />
                      ) : (
                        p.label
                      )}
                    </TableCell>
                    <TableCell>
                      {editing?.id === p.id ? (
                        <Input value={editing.unit || ''} onChange={e => setEditing({ ...editing, unit: e.target.value })} />
                      ) : (
                        p.unit || ''
                      )}
                    </TableCell>
                    <TableCell className="flex gap-2">
                      {editing?.id === p.id ? (
                        <>
                          <Button size="sm" onClick={() => handleSave(editing!)} disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin" /> : t('Save', 'சேமிக்க')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                            {t('Cancel', 'ரத்து செய்')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)} disabled={isLoading}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex justify-end">
          {isAdding ? (
            <div className="w-full space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={t('Name', 'பெயர்')} value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} />
                <Input placeholder={t('Unit (optional)', 'அலகு (விருப்பம்)')} value={draft.unit} onChange={e => setDraft({ ...draft, unit: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAdding(false)} disabled={isLoading}>{t('Cancel', 'ரத்து செய்')}</Button>
                <Button onClick={handleAdd} disabled={isLoading || !draft.label}>
                  {isLoading ? <Loader2 className="animate-spin" /> : t('Add Product', 'பொருள் சேர்க்க')}
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setIsAdding(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('Add Product', 'பொருள் சேர்க்க')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
