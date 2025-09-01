import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Pencil, Trash2, Calendar, MapPin, Mail, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Wedding = {
  id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  venue: string;
  contact_number?: string;
  email?: string;
  events?: Event[];
};

type Event = {
  id: number;
  event_name: string;
  event_date: string;
  event_time: string;
  location: string;
  description?: string;
};

const KanikalarPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [currentWedding, setCurrentWedding] = useState<Wedding | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [weddingToDelete, setWeddingToDelete] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchWeddings();
  }, []);

  const fetchWeddings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/kanikalar', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch weddings');
      }
      
      const data = await response.json();
      setWeddings(data);
    } catch (error) {
      console.error('Error fetching weddings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load weddings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWedding = () => {
    setCurrentWedding({
      id: 0,
      bride_name: '',
      groom_name: '',
      wedding_date: format(new Date(), 'yyyy-MM-dd'),
      venue: '',
      contact_number: '',
      email: ''
    });
    setIsDialogOpen(true);
  };

  const handleEditWedding = (wedding: Wedding) => {
    setCurrentWedding(wedding);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setWeddingToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!weddingToDelete) return;
    
    try {
      const response = await fetch(`/api/kanikalar/${weddingToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete wedding');
      }
      
      setWeddings(weddings.filter(wedding => wedding.id !== weddingToDelete));
      toast({
        title: t('success'),
        description: t('deletedSuccessfully'),
      });
    } catch (error) {
      console.error('Error deleting wedding:', error);
      toast({
        title: t('error'),
        description: 'Failed to delete wedding',
        variant: 'destructive'
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setWeddingToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWedding) return;
    
    const isEdit = currentWedding.id > 0;
    const url = isEdit 
      ? `/api/kanikalar/${currentWedding.id}`
      : '/api/kanikalar';
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(currentWedding)
      });
      
      if (!response.ok) {
        throw new Error(isEdit ? 'Failed to update wedding' : 'Failed to create wedding');
      }
      
      const data = await response.json();
      
      if (isEdit) {
        setWeddings(weddings.map(w => w.id === currentWedding.id ? { ...currentWedding, ...data } : w));
        toast({
          title: t('success'),
          description: t('updatedSuccessfully'),
        });
      } else {
        setWeddings([...weddings, { ...currentWedding, id: data.id }]);
        toast({
          title: t('success'),
          description: t('createdSuccessfully'),
        });
      }
      
      setIsDialogOpen(false);
      setCurrentWedding(null);
    } catch (error) {
      console.error('Error saving wedding:', error);
      toast({
        title: t('error'),
        description: isEdit ? 'Failed to update wedding' : 'Failed to create wedding',
        variant: 'destructive'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentWedding) return;
    setCurrentWedding({
      ...currentWedding,
      [e.target.name]: e.target.value
    });
  };

  const filteredWeddings = weddings.filter(wedding => 
    wedding.bride_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wedding.groom_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wedding.venue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('kanikalar')}</h1>
        <Button onClick={handleAddWedding}>
          <Plus className="mr-2 h-4 w-4" /> {t('addWedding')}
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder={t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : filteredWeddings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('noWeddings')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredWeddings.map((wedding) => (
            <Card key={wedding.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">
                      {wedding.bride_name} & {wedding.groom_name}
                    </CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(wedding.wedding_date), 'PPP')}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/kanikalar/${wedding.id}`)}
                    >
                      {t('viewWedding')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditWedding(wedding)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(wedding.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{wedding.venue}</span>
                  </div>
                  {wedding.contact_number && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a href={`tel:${wedding.contact_number}`} className="hover:underline">
                        {wedding.contact_number}
                      </a>
                    </div>
                  )}
                  {wedding.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a href={`mailto:${wedding.email}`} className="hover:underline">
                        {wedding.email}
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Wedding Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {currentWedding?.id ? t('editWedding') : t('addWedding')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="bride_name" className="text-right">
                  {t('brideName')}
                </label>
                <Input
                  id="bride_name"
                  name="bride_name"
                  value={currentWedding?.bride_name || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="groom_name" className="text-right">
                  {t('groomName')}
                </label>
                <Input
                  id="groom_name"
                  name="groom_name"
                  value={currentWedding?.groom_name || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="wedding_date" className="text-right">
                  {t('weddingDate')}
                </label>
                <Input
                  id="wedding_date"
                  name="wedding_date"
                  type="date"
                  value={currentWedding?.wedding_date || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="venue" className="text-right">
                  {t('venue')}
                </label>
                <Input
                  id="venue"
                  name="venue"
                  value={currentWedding?.venue || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="contact_number" className="text-right">
                  {t('contactNumber')}
                </label>
                <Input
                  id="contact_number"
                  name="contact_number"
                  type="tel"
                  value={currentWedding?.contact_number || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="email" className="text-right">
                  {t('email')}
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={currentWedding?.email || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button type="submit">{t('save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('confirmDelete')}</DialogTitle>
            <DialogDescription>
              {t('areYouSureDelete')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              {t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KanikalarPage;
