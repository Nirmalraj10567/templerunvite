import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Pencil, Calendar, MapPin, Phone, Mail, Clock, ArrowLeft } from 'lucide-react';
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
};

type Event = {
  id: number;
  event_name: string;
  event_date: string;
  event_time: string;
  location: string;
  description?: string;
};

const WeddingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState<boolean>(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<Event> | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);

  useEffect(() => {
    fetchWedding();
    fetchEvents();
  }, [id]);

  const fetchWedding = async () => {
    try {
      const response = await fetch(`/api/kanikalar/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch wedding details');
      }
      
      const data = await response.json();
      setWedding(data);
    } catch (error) {
      console.error('Error fetching wedding:', error);
      toast({
        title: t('error'),
        description: 'Failed to load wedding details',
        variant: 'destructive'
      });
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/wedding-events/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: t('error'),
        description: 'Failed to load events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = () => {
    setCurrentEvent({
      event_name: '',
      event_date: format(new Date(), 'yyyy-MM-dd'),
      event_time: '18:00',
      location: wedding?.venue || '',
      description: ''
    });
    setIsEventDialogOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setCurrentEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleDeleteClick = (eventId: number) => {
    setEventToDelete(eventId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    
    try {
      const response = await fetch(`/api/wedding-events/${eventToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete event');
      }
      
      setEvents(events.filter(event => event.id !== eventToDelete));
      toast({
        title: t('success'),
        description: t('deletedSuccessfully'),
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: t('error'),
        description: 'Failed to delete event',
        variant: 'destructive'
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setEventToDelete(null);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent || !wedding) return;
    
    const isEdit = !!currentEvent.id;
    const url = isEdit 
      ? `/api/wedding-events/${currentEvent.id}`
      : '/api/wedding-events';
    const method = isEdit ? 'PUT' : 'POST';
    
    const eventData = {
      ...currentEvent,
      kanikalar_id: wedding.id
    };
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });
      
      if (!response.ok) {
        throw new Error(isEdit ? 'Failed to update event' : 'Failed to create event');
      }
      
      const data = await response.json();
      
      if (isEdit) {
        setEvents(events.map(e => e.id === currentEvent.id ? { ...e, ...data } : e));
        toast({
          title: t('success'),
          description: t('updatedSuccessfully'),
        });
      } else {
        setEvents([...events, { ...data }]);
        toast({
          title: t('success'),
          description: t('createdSuccessfully'),
        });
      }
      
      setIsEventDialogOpen(false);
      setCurrentEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: t('error'),
        description: isEdit ? 'Failed to update event' : 'Failed to create event',
        variant: 'destructive'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!currentEvent) return;
    setCurrentEvent({
      ...currentEvent,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!wedding) {
    return (
      <div className="container mx-auto p-4">
        <Button variant="outline" onClick={() => navigate('/kanikalar')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> {t('back')}
        </Button>
        <p className="text-muted-foreground">{t('weddingNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Button 
        variant="outline" 
        onClick={() => navigate('/kanikalar')} 
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> {t('back')}
      </Button>
      
      <div className="grid gap-6">
        {/* Wedding Details Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">
                  {wedding.bride_name} & {wedding.groom_name}
                </CardTitle>
                <CardDescription className="mt-2">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {format(new Date(wedding.wedding_date), 'PPP')}
                  </div>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-muted-foreground" />
                <span>{wedding.venue}</span>
              </div>
              {wedding.contact_number && (
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-muted-foreground" />
                  <a href={`tel:${wedding.contact_number}`} className="hover:underline">
                    {wedding.contact_number}
                  </a>
                </div>
              )}
              {wedding.email && (
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
                  <a href={`mailto:${wedding.email}`} className="hover:underline">
                    {wedding.email}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Events Section */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{t('events')}</h2>
          <Button onClick={handleAddEvent} size="sm">
            <Plus className="h-4 w-4 mr-2" /> {t('addEvent')}
          </Button>
        </div>

        {events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('noEvents')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{event.event_name}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(event.event_date), 'PPP')}
                        <span className="mx-2">•</span>
                        <Clock className="h-4 w-4 mr-1" />
                        {event.event_time}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditEvent(event)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(event.id)}
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
                      <span>{event.location}</span>
                    </div>
                    {event.description && (
                      <p className="text-muted-foreground mt-2">{event.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent>
          <form onSubmit={handleEventSubmit}>
            <DialogHeader>
              <DialogTitle>
                {currentEvent?.id ? t('editEvent') : t('addEvent')}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="event_name" className="text-right">
                  {t('eventName')}
                </label>
                <Input
                  id="event_name"
                  name="event_name"
                  value={currentEvent?.event_name || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="event_date" className="text-right">
                  {t('eventDate')}
                </label>
                <Input
                  id="event_date"
                  name="event_date"
                  type="date"
                  value={currentEvent?.event_date || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="event_time" className="text-right">
                  {t('eventTime')}
                </label>
                <Input
                  id="event_time"
                  name="event_time"
                  type="time"
                  value={currentEvent?.event_time || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="location" className="text-right">
                  {t('location')}
                </label>
                <Input
                  id="location"
                  name="location"
                  value={currentEvent?.location || ''}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="description" className="text-right">
                  {t('description')}
                </label>
                <div className="col-span-3">
                  <textarea
                    id="description"
                    name="description"
                    value={currentEvent?.description || ''}
                    onChange={handleInputChange}
                    className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>
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
            <DialogTitle>{t('confirmEventDelete')}</DialogTitle>
            <DialogDescription>
              {t('areYouSureDeleteEvent')}
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

export default WeddingDetailPage;
