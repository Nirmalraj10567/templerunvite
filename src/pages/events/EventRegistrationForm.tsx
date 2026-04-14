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
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

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
    loadError: 'Failed to load event details',
    required: 'is required'
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
    loadError: 'நிகழ்வு விவரங்களை ஏற்ற முடியவில்லை',
    required: 'தேவை'
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

  // Use styles from formStyles
  const fieldStyles = formFieldStyles.input;
  const labelStyles = formFieldStyles.label;
  const textareaStyles = formFieldStyles.textarea;

  return (
  <div className={pageContainerStyles.container}>
        <div className={pageContainerStyles.content}>
          <Card className={formFieldStyles.card.container}>
            <CardHeader className={theme.card.header}>
              <CardTitle className="text-lg font-bold text-center">
              {id ? t.editEvent : t.createEvent}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6">
            {isLoading ? (
              <div className="py-12 text-center">
                <div className="text-lg font-medium">{t.loading}</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Main Form Grid */}
                <div className={formFieldStyles.eventForm.formGrid}>
                  
                  {/* Event Details Section */}
                  <div className="space-y-6">
                    <div>
                      <Input 
                        id="title" 
                        className={fieldStyles}
                        {...register('title', { required: t.eventTitle + ' ' + t.required })} 
                        placeholder={t.eventTitle + ' *'}
                      />
                      {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                    </div>
                    
                    <div>
                      <Textarea 
                        id="description" 
                        className={textareaStyles}
                        {...register('description', { required: t.description + ' ' + t.required })} 
                        placeholder={t.description + ' *'}
                      />
                      {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                    </div>
                    
                    <div className={formFieldStyles.eventForm.dateTimeGrid}>
                      <div>
                        <Input 
                          id="date" 
                          type="date" 
                          className={fieldStyles}
                          {...register('date', { required: t.date + ' ' + t.required })} 
                          placeholder={t.date + ' *'}
                        />
                        {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                      </div>
                      
                      <div>
                        <Input 
                          id="time" 
                          type="time" 
                          className={fieldStyles}
                          {...register('time', { required: t.time + ' ' + t.required })} 
                          placeholder={t.time + ' *'}
                        />
                        {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>}
                      </div>
                    </div>
                    
                    <div>
                      <Input 
                        id="location" 
                        className={fieldStyles}
                        {...register('location', { required: t.location + ' ' + t.required })} 
                        placeholder={t.location + ' *'}
                      />
                      {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
                    </div>
                  </div>
                  
                  {/* Event Images Section */}
                  <div className="space-y-6">
                    <div>
                      <Label className={labelStyles}>
                        {t.eventImages}
                      </Label>
                      
                      <div className={formFieldStyles.eventForm.imageUpload.container}>
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
                          className={formFieldStyles.eventForm.imageUpload.button}
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <ImagePlus className="mr-2 h-4 w-4" /> {t.uploadImages}
                        </Button>
                        <p className={formFieldStyles.eventForm.imageUpload.helpText}>
                          {t.imageFormats}
                        </p>
                      </div>
                    </div>
                    
                    {imageFields.length > 0 && (
                      <div className={formFieldStyles.eventForm.imagePreview.grid}>
                        {imageFields.map((field, index) => (
                          <div key={field.id} className={formFieldStyles.eventForm.imagePreview.item}>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className={formFieldStyles.eventForm.imagePreview.deleteButton}
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            
                            {(() => {
                              // Show preview for either existing URL or newly uploaded File
                              const anyField = field as unknown as EventImage;
                              const src = anyField.url || (anyField.file instanceof File ? URL.createObjectURL(anyField.file) : undefined);
                              return src ? (
                                <div className="mb-3">
                                  <img 
                                    src={src}
                                    alt={`Preview ${index}`}
                                    className={formFieldStyles.eventForm.imagePreview.image}
                                    onLoad={() => {
                                      if (anyField.file instanceof File) {
                                        URL.revokeObjectURL(src);
                                      }
                                    }}
                                  />
                                </div>
                              ) : null;
                            })()}
                          
                          <div className={formFieldStyles.eventForm.imagePreview.form}>
                            <div>
                              <Input 
                                className="text-sm py-2 px-3 h-9"
                                placeholder={t.imageTitle} 
                                {...register(`images.${index}.title`)} 
                              />
                            </div>
                            <div>
                              <Textarea 
                                className="text-sm py-2 px-3 min-h-[60px]"
                                placeholder={t.imageCaption} 
                                {...register(`images.${index}.caption`)} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className={formFieldStyles.eventForm.actionButtons}>
                 
                  <Button 
                    type="submit" 
                    className={formFieldStyles.eventForm.submitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t.saving : (id ? t.updateEvent : t.createEvent)}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}