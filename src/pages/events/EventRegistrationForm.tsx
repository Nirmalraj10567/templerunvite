import React, { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { X, ImagePlus, Trash2 } from 'lucide-react';
import eventService from '@/services/eventService';
import { Event, EventImage } from '@/types/event';
import { toast } from '@/components/ui/use-toast';

export default function EventRegistrationForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { 
    register, 
    control, 
    handleSubmit, 
    formState: { errors }, 
    reset
  } = useForm<Event>({
    defaultValues: {
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      images: []
    }
  });

  const { fields: imageFields, append, remove } = useFieldArray({
    control,
    name: 'images'
  });

  // Load existing event data in edit mode
  useEffect(() => {
    const loadEvent = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await eventService.getEventById(id);
        // Ensure images have the expected shape: may include id, url, title, caption
        const images = (data.images || []).map((img) => ({
          id: img.id,
          url: img.url,
          title: img.title || '',
          caption: img.caption || ''
        } as EventImage));
        // Populate form
        reset({
          title: data.title || '',
          description: data.description || '',
          date: data.date || '',
          time: data.time || '',
          location: data.location || '',
          images
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to load event details',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        append({
          file,
          title: '',
          caption: ''
        });
      });
    }
  };

  const onSubmit = async (data: Event) => {
    try {
      setIsSubmitting(true);
      
      if (id) {
        // Update existing event
        await eventService.updateEvent(id, data);
        toast({ title: 'Event updated successfully' });
      } else {
        // Create new event
        await eventService.createEvent(data);
        toast({ title: 'Event created successfully' });
      }
      
      navigate('/dashboard/events');
    } catch (error) {
      console.error('Error submitting event:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit event',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{id ? 'Edit Event' : 'Create Event'}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center">Loading...</div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Event Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input 
                  id="title" 
                  {...register('title', { required: 'Event title is required' })} 
                  placeholder="Enter event title"
                />
                {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  {...register('description', { required: 'Event description is required' })} 
                  placeholder="Describe your event"
                />
                {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    {...register('date', { required: 'Event date is required' })} 
                  />
                  {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input 
                    id="time" 
                    type="time" 
                    {...register('time', { required: 'Event time is required' })} 
                  />
                  {errors.time && <p className="text-red-500 text-sm">{errors.time.message}</p>}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input 
                  id="location" 
                  {...register('location', { required: 'Event location is required' })} 
                  placeholder="Enter event location"
                />
                {errors.location && <p className="text-red-500 text-sm">{errors.location.message}</p>}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Event Images</h3>
              
              <div className="border-2 border-dashed p-4 rounded-lg text-center">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImagePlus className="mr-2 h-4 w-4" /> Upload Images
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {imageFields.map((field, index) => (
                  <div key={field.id} className="relative border rounded-lg p-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => remove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    
                    {(() => {
                      // Show preview for either existing URL or newly uploaded File
                      const anyField = field as unknown as EventImage;
                      const src = anyField.url || (anyField.file instanceof File ? URL.createObjectURL(anyField.file) : undefined);
                      return src ? (
                        <img 
                          src={src}
                          alt={`Preview ${index}`}
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                      ) : null;
                    })()}
                    
                    <div className="space-y-2">
                      <Input 
                        placeholder="Image Title" 
                        {...register(`images.${index}.title`)} 
                      />
                      <Textarea 
                        placeholder="Image Caption" 
                        {...register(`images.${index}.caption`)} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-6">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/events')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : (id ? 'Update Event' : 'Create Event')}
            </Button>
          </div>
        </form>
        )}
      </CardContent>
    </Card>
  );
}
