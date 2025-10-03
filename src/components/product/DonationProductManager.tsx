import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { useLanguage } from '@/lib/language';

export type DonationProduct = {
  id: number;
  value: string; // will mirror label
  label: string; // product name
  unit?: string;
  templeId: number;
};

export function DonationProductManager({
  products,
  setProducts,
  templeId,
}: {
  products: DonationProduct[];
  setProducts: React.Dispatch<React.SetStateAction<DonationProduct[]>>;
  templeId: number;
}) {
  if (!templeId) {
    console.error('Temple ID is required for DonationProductManager');
    return null;
  }

  // Ensure products is always an array
  const safeProducts = Array.isArray(products) ? products : [];
  const { language } = useLanguage();
  // Follow the same helper style used in pages: if language is 'english', show Tamil label (app-wide convention)
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editing, setEditing] = useState<DonationProduct | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<Pick<DonationProduct, 'label' | 'unit'>>({ label: '', unit: '' });
  const [availableUnits, setAvailableUnits] = useState<string[]>([]);
  const [showEditingDropdown, setShowEditingDropdown] = useState(false);
  const [showAddingDropdown, setShowAddingDropdown] = useState(false);
  const [isAddingNewUnit, setIsAddingNewUnit] = useState<boolean>(false);
  const [newUnit, setNewUnit] = useState<string>('');

  // Extract unique units from products
  const extractUnits = (products: DonationProduct[]) => {
    const units = products
      .filter(p => p && p.unit && p.unit.trim())
      .map(p => p.unit!.trim())
      .filter((unit, index, arr) => arr.indexOf(unit) === index) // Remove duplicates
      .sort();
    return units;
  };

  // Update available units when products change
  useEffect(() => {
    const units = extractUnits(safeProducts);
    setAvailableUnits(units);
  }, [safeProducts]);


  const handleAdd = async () => {
    if (isLoading) return;
    const label = draft.label.trim();
    const unit = (draft.unit || '').trim();
    if (!label) return;
    if (safeProducts.some(p => p && p.label && p.label.toLowerCase() === label.toLowerCase())) return;
    try {
      setIsLoading(true);
      const resp = await axios.post<{ success: boolean; data: DonationProduct }>(
        `/api/donation-products/${templeId}`,
        { value: label, label, unit, templeId },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      
      // Handle backend response structure: { success: true, data: product }
      const newProduct = resp.data.data;
      
      if (newProduct && newProduct.id && newProduct.label) {
        setProducts(prev => [...(Array.isArray(prev) ? prev : []), newProduct]);
      }
      setDraft({ label: '', unit: '' });
      setIsAdding(false);
    } catch (e) {
      console.error('Add product failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewUnit = () => {
    if (newUnit.trim() && !availableUnits.includes(newUnit.trim())) {
      setAvailableUnits(prev => [...prev, newUnit.trim()].sort());
      setDraft(prev => ({ ...prev, unit: newUnit.trim() }));
    }
    setNewUnit('');
    setIsAddingNewUnit(false);
  };

  const handleSave = async (item: DonationProduct) => {
    if (isLoading || !item) return;
    const label = (item.label || '').trim();
    const unit = (item.unit || '').trim();
    if (!label) return;
    try {
      setIsLoading(true);
      const resp = await axios.put<{ success: boolean; data: DonationProduct }>(
        `/api/donation-products/${templeId}/${item.id}`,
        { value: label, label, unit, templeId },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      
      // Handle backend response structure: { success: true, data: product }
      const updatedProduct = resp.data.data;
      if (updatedProduct && updatedProduct.id && updatedProduct.label) {
        setProducts(prev => (Array.isArray(prev) ? prev : []).map(p => (p && p.id === item.id ? updatedProduct : p)));
      }
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
      await axios.delete(`/api/donation-products/${templeId}/${id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      setProducts(prev => (Array.isArray(prev) ? prev : []).filter(p => p && p.id !== id));
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
      <DialogContent className="max-w-4xl w-full max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('Manage Products', 'பொருள் மேலாண்மை')}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-visible relative">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-left w-1/3">{t('Name', 'பெயர்')}</TableHead>
                <TableHead className="font-semibold text-left w-1/3">{t('Unit', 'அலகு')} 📦</TableHead>
                <TableHead className="font-semibold text-center w-1/3">{t('Actions', 'செயல்கள்')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!safeProducts || safeProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                    {t('No products found. Add a new one below.', 'பொருட்கள் எதுவும் இல்லை. கீழே புதியதைச் சேர்க்கவும்.')}
                  </TableCell>
                </TableRow>
              ) : (
                safeProducts.filter(p => p && p.id && p.label).map(p => (
                <TableRow key={p.id} className="hover:bg-gray-50">
                  <TableCell className="w-1/3">
                      {editing?.id === p.id ? (
                      <Input 
                        value={editing?.label || ''} 
                        onChange={e => setEditing(editing ? { ...editing, label: e.target.value } : null)} 
                        className="w-full"
                        placeholder={t('Enter product name', 'பொருள் பெயர் உள்ளிடவும்')}
                      />
                    ) : (
                      <span className="font-medium">{p.label}</span>
                      )}
                    </TableCell>
                    <TableCell className="w-1/3">
                      {editing?.id === p.id ? (
                        <div className="relative w-full">
                          <Input 
                            value={editing?.unit || ''} 
                            onChange={e => setEditing(editing ? { ...editing, unit: e.target.value } : null)}
                            onFocus={() => setShowEditingDropdown(true)}
                            placeholder={t('Enter or select unit', 'அலகு உள்ளிடவும் அல்லது தேர்ந்தெடுக்கவும்')}
                            className="w-full"
                          />
                          {showEditingDropdown && availableUnits.length > 0 && (
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-40 overflow-auto z-50">
                              {availableUnits.map((unit, index) => (
                                <div
                                  key={index}
                                  className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setEditing(editing ? { ...editing, unit } : null);
                                    setShowEditingDropdown(false);
                                  }}
                                >
                                  📦 {unit}
                                </div>
                              ))}
                              <div className="px-3 py-2 text-sm border-t border-gray-200 bg-gray-50">
                                <button
                                  type="button"
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setIsAddingNewUnit(true);
                                    setShowEditingDropdown(false);
                                  }}
                                >
                                  ➕ {t('Add New Unit', 'புதிய அலகு சேர்க்க')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <span className="text-gray-600 mr-2">📦</span>
                          <span>{p.unit || t('No unit', 'அலகு இல்லை')}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="w-1/3 text-center">
                      <div className="flex gap-2 justify-center">
                      {editing?.id === p.id ? (
                        <>
                          <Button size="sm" onClick={() => editing && handleSave(editing)} disabled={isLoading}>
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-6 border-t pt-6">
          {isAdding ? (
            <div className="w-full space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('Product Name', 'பொருள் பெயர்')}</label>
                  <Input 
                    placeholder={t('Enter product name', 'பொருள் பெயர் உள்ளிடவும்')} 
                    value={draft.label} 
                    onChange={e => setDraft({ ...draft, label: e.target.value })} 
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('Unit', 'அலகு')} 📦</label>
                  <div className="relative">
                    <Input 
                      placeholder={t('Unit (optional)', 'அலகு (விருப்பம்)')} 
                      value={draft.unit} 
                      onChange={e => setDraft({ ...draft, unit: e.target.value })}
                      onFocus={() => setShowAddingDropdown(true)}
                      className="w-full"
                    />
                    {showAddingDropdown && availableUnits.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-40 overflow-auto z-50">
                        {availableUnits.map((unit, index) => (
                          <div
                            key={index}
                            className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setDraft({ ...draft, unit });
                              setShowAddingDropdown(false);
                            }}
                          >
                            📦 {unit}
                          </div>
                        ))}
                        <div className="px-3 py-2 text-sm border-t border-gray-200 bg-gray-50">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setIsAddingNewUnit(true);
                              setShowAddingDropdown(false);
                            }}
                          >
                            ➕ {t('Add New Unit', 'புதிய அலகு சேர்க்க')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
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

        {/* Add New Unit Modal */}
        {isAddingNewUnit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">{t('Add New Unit', 'புதிய அலகு சேர்க்க')}</h3>
              <Input
                placeholder={t('Enter new unit', 'புதிய அலகு உள்ளிடவும்')}
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className="mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsAddingNewUnit(false);
                    setNewUnit('');
                  }}
                >
                  {t('Cancel', 'ரத்து செய்')}
                </Button>
                <Button 
                  onClick={handleAddNewUnit}
                  disabled={!newUnit.trim()}
                >
                  {t('Add Unit', 'அலகு சேர்க்க')}
                </Button>
              </div>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
