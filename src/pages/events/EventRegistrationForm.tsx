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
import { useLanguage } from '@/lib/language';

// Translation object
const translations = {
  tamil: {
    createEvent: 'Create Event',
    editEvent: 'Edit Event',
    eventDetails: 'Event Details',
    eventTitle: 'Event Title',
    description: 'Description',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    eventImages: 'Event Images',
    uploadImages: 'Upload Images',
    imageFormats: 'PNG, JPG, WEBP up to 10MB',
    imageTitle: 'Image Title',
    imageCaption: 'Image Caption',
    cancel: 'Cancel',
    saving: 'Saving...',
    updateEvent: 'Update Event',
    loading: 'Loading...',
    success: 'successfully',
    error: 'Error',
    submitError: 'Failed to submit event',
    loadError: 'Failed to load event details'
  },
  english: {
    createEvent: 'நிகழ்வை உருவாக்கு',
    editEvent: 'நிகழ்வைத் திருத்து',
    eventDetails: 'நிகழ்வு விவரங்கள்',
    eventTitle: 'நிகழ்வு தலைப்பு',
    description: 'விளக்கம்',
    date: 'தேதி',
    time: 'நேரம்',
    location: 'இடம்',
    eventImages: 'நிகழ்வு படங்கள்',
    uploadImages: 'படங்களை பதிவேற்று',
    imageFormats: 'PNG, JPG, WEBP 10MB வரை',
    imageTitle: 'படம் தலைப்பு',
    imageCaption: 'படம் விளக்கம்',
    cancel: 'ரத்து செய்',
    saving: 'சேமிக்கிறது...',
    updateEvent: 'நிகழ்வைப் புதுப்பி',
    loading: 'ஏற்றுகிறது...',
    success: 'வெற்றிகரமாக',
    error: 'பிழை',
    submitError: 'நிகழ்வை சமர்ப்பிக்க முடியவில்லை',
    loadError: 'நிகழ்வு விவரங்களை ஏற்ற முடியவில்லை'
  }
} as const;

export default function EventRegistrationForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { language } = useLanguage();
  const t = translations[language];

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
          title: t.error,
          description: t.loadError,
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
        toast({ title: t.updateEvent + ' ' + t.success });
      } else {
        // Create new event
        await eventService.createEvent(data);
        toast({ title: t.createEvent + ' ' + t.success });
      }
      
      navigate('/dashboard/events');
    } catch (error) {
      console.error('Error submitting event:', error);
      toast({
        title: t.error,
        description: t.submitError,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{id ? t.editEvent : t.createEvent}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center">{t.loading}</div>
        ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t.eventDetails}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="title">{t.eventTitle}</Label>
                <Input 
                  id="title" 
                  {...register('title', { required: t.eventTitle + ' ' + t.required })} 
                  placeholder={t.eventTitle}
                />
                {errors.title && <p className="text-red-500 text-sm">{errors.title.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t.description}</Label>
                <Textarea 
                  id="description" 
                  {...register('description', { required: t.description + ' ' + t.required })} 
                  placeholder={t.description}
                />
                {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">{t.date}</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    {...register('date', { required: t.date + ' ' + t.required })} 
                  />
                  {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="time">{t.time}</Label>
                  <Input 
                    id="time" 
                    type="time" 
                    {...register('time', { required: t.time + ' ' + t.required })} 
                  />
                  {errors.time && <p className="text-red-500 text-sm">{errors.time.message}</p>}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">{t.location}</Label>
                <Input 
                  id="location" 
                  {...register('location', { required: t.location + ' ' + t.required })} 
                  placeholder={t.location}
                />
                {errors.location && <p className="text-red-500 text-sm">{errors.location.message}</p>}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t.eventImages}</h3>
              
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
                  <ImagePlus className="mr-2 h-4 w-4" /> {t.uploadImages}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.imageFormats}
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
                        placeholder={t.imageTitle} 
                        {...register(`images.${index}.title`)} 
                      />
                      <Textarea 
                        placeholder={t.imageCaption} 
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
              {t.cancel}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.saving : (id ? t.updateEvent : t.createEvent)}
            </Button>
          </div>
        </form>
        )}
      </CardContent>
    </Card>
  );
}
