import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { Calendar, MapPin, Clock, Search, Plus, ImageIcon } from 'lucide-react';
import eventService from '@/services/eventService';
import { Event } from '@/types/event';
import { toast } from '@/components/ui/use-toast';

export default function EventListView() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const navigate = useNavigate();

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const { data } = await eventService.getEvents(page, 10, search);
      setEvents(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch events',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, search]);

  const handleSearch = () => {
    setPage(1);
    fetchEvents();
  };

  const openImageGallery = async (event: Event) => {
    // Open dialog immediately with current list data for fast UX
    setSelectedEvent(event);
    setImageDialogOpen(true);
    try {
      const full = await eventService.getEventById(String(event.id));
      // Replace with full details that include image title/caption
      setSelectedEvent(full);
    } catch (e) {
      // Keep the existing minimal data; toast already handled in service if needed
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await eventService.deleteEvent(id.toString());
      toast({
        title: 'Success',
        description: 'Event deleted successfully'
      });
      fetchEvents();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete event',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Temple Events</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search events..." 
                className="pl-10 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={() => navigate('/dashboard/events/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create Event
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">No events found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => (
                <Card key={event.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {event.images && event.images.length > 0 && (() => {
                      const first = event.images[0];
                      const src = first.url || (first.file ? URL.createObjectURL(first.file) : undefined);
                      return src ? (
                        <img 
                          src={src}
                          alt={event.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                      ) : null;
                    })()}
                    <div className="p-4 space-y-2">
                      <h3 className="text-lg font-semibold">{event.title}</h3>
                      <div className="flex items-center text-muted-foreground space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openImageGallery(event)}
                        >
                          <ImageIcon className="mr-2 h-4 w-4" /> Gallery
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/dashboard/events/edit/${event.id}`)}
                        >
                          Edit Event
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(event.id);
                          }}
                        >
                          Delete
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

      {/* Image Gallery Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title} - Image Gallery</DialogTitle>
            <DialogDescription>
              View images from the event
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && selectedEvent.images.length > 0 && (
            <Carousel className="w-full max-w-3xl mx-auto">
              <CarouselContent>
                {selectedEvent.images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <Card>
                        <CardContent className="flex aspect-square items-center justify-center p-6">
                          {(() => {
                            const src = image.url || (image.file ? URL.createObjectURL(image.file) : undefined);
                            return src ? (
                              <img 
                                src={src}
                                alt={image.title || `Event Image ${index + 1}`}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : null;
                          })()}
                        </CardContent>
                        {(image.title || image.caption) && (
                          <div className="p-4 bg-gray-50">
                            {image.title && <h4 className="font-semibold">{image.title}</h4>}
                            {image.caption && <p className="text-muted-foreground">{image.caption}</p>}
                          </div>
                        )}
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
