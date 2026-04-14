import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { 
  Carousel, CarouselContent, CarouselItem, 
  CarouselNext, CarouselPrevious 
} from '@/components/ui/carousel';
import { Calendar, MapPin, Clock, Search, Plus, ImageIcon } from 'lucide-react';
import eventService from '@/services/eventService';
import { Event } from '@/types/event';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/lib/language';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

// Translation object
const translations = {
  tamil: {
    templeEvents: 'Temple Events',
    searchEvents: 'Search events...',
    create: 'Create',
    loadingEvents: 'Loading events...',
    noEvents: 'No events found',
    success: 'Success',
    eventDeleted: 'Event deleted successfully',
    error: 'Error',
    fetchError: 'Failed to fetch events',
    deleteError: 'Failed to delete event',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    edit: 'Edit',
    delete: 'Delete'
  },
  english: {
    templeEvents: 'கோவில் நிகழ்வுகள்',
    searchEvents: 'நிகழ்வுகளை தேடு...',
    create: 'உருவாக்கு',
    loadingEvents: 'நிகழ்வுகள் ஏற்றப்படுகின்றன...',
    noEvents: 'நிகழ்வுகள் எதுவும் கிடைக்கவில்லை',
    success: 'வெற்றி',
    eventDeleted: 'நிகழ்வு வெற்றிகரமாக நீக்கப்பட்டது',
    error: 'பிழை',
    fetchError: 'நிகழ்வுகளைப் பெற முடியவில்லை',
    deleteError: 'நிகழ்வை நீக்க முடியவில்லை',
    date: 'தேதி',
    time: 'நேரம்',
    location: 'இடம்',
    edit: 'திருத்து',
    delete: 'நீக்கு'
  }
};

export default function EventListView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language];

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data } = await eventService.getEvents(page, 10, search);
      setEvents(data);
    } catch {
      toast({ title: t.error, description: t.fetchError, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [page, search]);

  const handleSearch = () => { setPage(1); fetchEvents(); };

  const openImageGallery = async (event: Event) => {
    setSelectedEvent(event);
    setImageDialogOpen(true);
    try {
      const full = await eventService.getEventById(String(event.id));
      setSelectedEvent(full);
    } catch {}
  };

  const handleDelete = async (id: number) => {
    try {
      await eventService.deleteEvent(id.toString());
      toast({ title: t.success, description: t.eventDeleted });
      fetchEvents();
    } catch {
      toast({ title: t.error, description: t.deleteError, variant: 'destructive' });
    }
  };

  return (


    <div  className={pageContainerStyles.container}>
      <Card>
        <CardHeader className={theme.card.header}>
          <CardTitle className="text-sm font-semibold">{t.templeEvents}</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {loading ? (
            <div className="text-center py-6">{t.loadingEvents}</div>
          ) : events.length === 0 ? (
            <div className="text-center py-6">{t.noEvents}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {events.map(event => (
                <Card key={event.id} className="hover:shadow-md transition">
                  <CardContent className="p-0">
                    {event.images?.length > 0 && (() => {
                      const first = event.images[0];
                      const src = first.url || (first.file ? URL.createObjectURL(first.file) : undefined);
                      return src ? (
                        <img 
                          src={src} alt={event.title}
                          className="w-full h-32 object-cover cursor-pointer"
                          onClick={() => openImageGallery(event)}
                        />
                      ) : null;
                    })()}
                    <div className="p-3 space-y-2">
                      <h3 className="font-medium">{event.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{t.date}: {new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{t.time}: {event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{t.location}: {event.location}</span>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 px-2"
                          onClick={() => navigate(`/dashboard/events/edit/${event.id}`)}
                        >
                          {t.edit}
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-6 px-2"
                          onClick={() => handleDelete(event.id)}
                        >
                          {t.delete}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl p-3">
          <DialogHeader>
            <DialogTitle className="text-sm">{selectedEvent?.title} - Gallery</DialogTitle>
            <DialogDescription className="text-[11px]">
              View images from this event
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && selectedEvent.images?.length > 0 && (
            <Carousel className="w-full max-w-2xl mx-auto">
              <CarouselContent>
                {selectedEvent.images.map((image, index) => (
                  <CarouselItem key={index}>
                    <Card>
                      <CardContent className="flex aspect-square items-center justify-center p-3">
                        {(() => {
                          const src = image.url || (image.file ? URL.createObjectURL(image.file) : undefined);
                          return src ? (
                            <img 
                              src={src}
                              alt={image.title || `Image ${index + 1}`}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : null;
                        })()}
                      </CardContent>
                      {(image.title || image.caption) && (
                        <div className="p-2 bg-gray-50 text-xs">
                          {image.title && <h4 className="font-semibold">{image.title}</h4>}
                          {image.caption && <p className="text-muted-foreground">{image.caption}</p>}
                        </div>
                      )}
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="scale-90" />
              <CarouselNext className="scale-90" />
            </Carousel>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
