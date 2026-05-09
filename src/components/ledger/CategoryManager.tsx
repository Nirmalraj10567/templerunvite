import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/language';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { getAuthToken } from '@/lib/auth';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

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
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategory, setNewCategory] = useState<Omit<Category, 'id'>>({ value: '', label: '' });
  
  const templeId = user?.templeId;

  // Translations object with English and Tamil
  const translations = {
    tamil: {
      "manageCategories": "Manage Categories",
      "label": "Label",
      "actions": "Actions",
      "noCategoriesFound": "No categories found. Add a new category below.",
      "save": "Save",
      "cancel": "Cancel",
      "addCategory": "Add Category",
      "success": "Success",
      "categoryUpdatedSuccessfully": "Category updated successfully",
      "error": "Error",
      "failedToUpdateCategory": "Failed to update category",
      "templeIdNotAvailable": "Temple ID not available",
      "categoryDeletedSuccessfully": "Category deleted successfully",
      "failedToDeleteCategory": "Failed to delete category",
      "categoryAddedSuccessfully": "Category added successfully",
      "failedToAddCategory": "Failed to add category",
      "categoryAlreadyExists": "Category already exists"
    },
    english: {
      "manageCategories": "வகைகளை நிர்வகிக்கவும்",
      "label": "லேபிள்",
      "actions": "செயல்கள்",
      "noCategoriesFound": "வகைகள் எதுவும் கிடைக்கவில்லை. புதிய வகையைச் சேர்க்கவும்.",
      "save": "சேமிக்கவும்",
      "cancel": "ரத்து செய்",
      "addCategory": "வகையைச் சேர்க்கவும்",
      "success": "வெற்றி",
      "categoryUpdatedSuccessfully": "வகை வெற்றிகரமாக புதுப்பிக்கப்பட்டது",
      "error": "பிழை",
      "failedToUpdateCategory": "வகையை புதுப்பிக்க முடியவில்லை",
      "templeIdNotAvailable": "கோவில் ஐடி கிடைக்கவில்லை",
      "categoryDeletedSuccessfully": "வகை வெற்றிகரமாக நீக்கப்பட்டது",
      "failedToDeleteCategory": "வகையை நீக்க முடியவில்லை",
      "categoryAddedSuccessfully": "வகை வெற்றிகரமாக சேர்க்கப்பட்டது",
      "failedToAddCategory": "வகையை சேர்க்க முடியவில்லை",
      "categoryAlreadyExists": "வகை ஏற்கனவே உள்ளது"
    }
  };

  // Translation helper function
  const t = (key: keyof typeof translations.english): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.english;
    return currentTranslations[key] || translations.english[key] || key;
  };
  
  // If you want value to equal label, no slug required
  const asIs = (s: string) => s.trim();

  const handleEdit = async (category: Category) => {
    if (isLoading) return; // prevent duplicate rapid submissions
    if (!templeId) {
      console.error('Temple ID not available');
      return;
    }
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
        `https://templeapi.agniplay.com/api/ledger/categories/${category.id}`,
        {
          value: payloadValue,
          label: payloadLabel,
          templeId: templeId
        },
        {
          headers: { Authorization: `Bearer ${getAuthToken()}` }
        }
      );
      
      setCategories(categories.map(c =>
        c.id === category.id ? { ...c, value: payloadValue, label: payloadLabel } : c
      ));
      setEditingCategory(null);
      toast({
        title: t('success'),
        description: t('categoryUpdatedSuccessfully'),
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateCategory'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isLoading) return; // prevent duplicate rapid deletions
    if (!templeId) {
      toast({
        title: t('error'),
        description: t('templeIdNotAvailable'),
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsLoading(true);
      await axios.delete(`https://templeapi.agniplay.com/api/ledger/categories/${id}?templeId=${templeId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` }
      });
      setCategories(categories.filter(c => c.id !== id));
      toast({
        title: t('success'),
        description: t('categoryDeletedSuccessfully'),
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: t('error'),
        description: t('failedToDeleteCategory'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (isLoading) return; // prevent duplicate rapid adds
    if (!templeId) {
      console.error('Temple ID not available');
      return;
    }
    const nextLabel = newCategory.label.trim();
    const nextVal = (newCategory.value?.trim()) || asIs(nextLabel); // value = label
    if (!nextVal || !nextLabel) return;
    // prevent duplicates (case-insensitive)
    const exists = categories.some(c => c.value.toLowerCase() === nextVal.toLowerCase() || c.label.toLowerCase() === nextLabel.toLowerCase());
    if (exists) {
      console.warn(t('categoryAlreadyExists'));
      return;
    }
    try {
      setIsLoading(true);
      const response = await axios.post<Category>(
        'https://templeapi.agniplay.com/api/ledger/categories',
        { value: nextVal, label: nextLabel, templeId: templeId },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      setCategories([...categories, response.data]);
      setNewCategory({ value: '', label: '' });
      setIsAdding(false);
      toast({
        title: t('success'),
        description: t('categoryAddedSuccessfully'),
      });
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: t('error'),
        description: t('failedToAddCategory'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {t('manageCategories')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('manageCategories')}</DialogTitle>
        </DialogHeader>
        
        <div className="max-h-80 overflow-y-auto">
        <Table>
          <TableHeader>
             <TableRow  className="whitespace-nowrap">
              <TableHead>{t('label')}</TableHead>
              <TableHead>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
               <TableRow  className="whitespace-nowrap">
                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                  {t('noCategoriesFound')}
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
                          {isLoading ? <Loader2 className="animate-spin" /> : t('save')}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEditingCategory(null)}
                        >
                          {t('cancel')}
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
                  placeholder={t('label')}
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
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleAdd}
                  disabled={isLoading || !newCategory.value || !newCategory.label}
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : t('addCategory')}
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
              {t('addCategory')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}