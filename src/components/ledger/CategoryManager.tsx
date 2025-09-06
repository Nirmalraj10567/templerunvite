import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { useState } from 'react';

type Category = {
  id: number;
  value: string;
  label: string;
};

export function CategoryManager({ 
  categories,
  setCategories
}: {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>({ value: '', label: '' });
  
  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);
  // If you want value to equal label, no slug required
  const asIs = (s: string) => s.trim();

  const handleEdit = async (category: Category) => {
    if (isLoading) return; // prevent duplicate rapid submissions
    // Avoid no-op update
    const original = categories.find(c => c.id === category.id);
    if (original && original.label === category.label) {
      setEditingCategory(null);
      return;
    }
    try {
      setIsLoading(true);
      const payloadLabel = category.label.trim();
      const payloadValue = asIs(payloadLabel); // value = label
      const response = await axios.put<Category>(
        `/api/ledger/categories/${category.id}`,
        {
          value: payloadValue,
          label: payloadLabel
        },
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );
      
      setCategories(categories.map(c =>
        c.id === category.id ? { ...c, value: payloadValue, label: payloadLabel } : c
      ));
      setEditingCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isLoading) return; // prevent duplicate rapid deletions
    try {
      setIsLoading(true);
      await axios.delete(`/api/ledger/categories/${id}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setCategories(categories.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (isLoading) return; // prevent duplicate rapid adds
    const nextLabel = newCategory.label.trim();
    const nextVal = (newCategory.value?.trim()) || asIs(nextLabel); // value = label
    if (!nextVal || !nextLabel) return;
    // prevent duplicates (case-insensitive)
    const exists = categories.some(c => c.value.toLowerCase() === nextVal.toLowerCase() || c.label.toLowerCase() === nextLabel.toLowerCase());
    if (exists) {
      console.warn('Category already exists.');
      return;
    }
    try {
      setIsLoading(true);
      const response = await axios.post<Category>(
        '/api/ledger/categories',
        { value: nextVal, label: nextLabel },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      setCategories([...categories, response.data]);
      setNewCategory({ value: '', label: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {t('Manage Categories', 'வகைகளை நிர்வகிக்கவும்')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Manage Categories', 'வகைகளை நிர்வகிக்கவும்')}</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Label', 'லேபிள்')}</TableHead>
              <TableHead>{t('Actions', 'செயல்கள்')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                  {t('No categories found. Add a new category below.', 'வகைகள் எதுவும் கிடைக்கவில்லை. புதிய வகையைச் சேர்க்கவும்.')}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    {editingCategory?.id === category.id ? (
                      <Input 
                        value={editingCategory.label}
                        onChange={(e) => setEditingCategory({
                          ...editingCategory,
                          label: e.target.value
                        })}
                      />
                    ) : (
                      category.label
                    )}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    {editingCategory?.id === category.id ? (
                      <>
                        <Button 
                          size="sm" 
                          onClick={() => handleEdit(editingCategory)}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="animate-spin" /> : t('Save', 'சேமிக்கவும்')}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingCategory(null)}
                        >
                          {t('Cancel', 'ரத்து செய்')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => !isLoading && setEditingCategory(category)}
                          disabled={isLoading}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleDelete(category.id)}
                          disabled={isLoading}
                        >
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
              <div className="space-y-1">
                <Input
                  placeholder={t('Label', 'லேபிள்')}
                  value={newCategory.label}
                  onChange={(e) => setNewCategory({ value: e.target.value, label: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                  disabled={isLoading}
                >
                  {t('Cancel', 'ரத்து செய்')}
                </Button>
                <Button 
                  onClick={handleAdd}
                  disabled={isLoading || !newCategory.value || !newCategory.label}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : t('Add Category', 'வகையைச் சேர்க்கவும்')}
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => !isLoading && setIsAdding(true)}
              variant="outline"
              className="gap-2"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4" />
              {t('Add Category', 'வகையைச் சேர்க்கவும்')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
