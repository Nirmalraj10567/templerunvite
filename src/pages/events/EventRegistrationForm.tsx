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

  // Enter key handler: focus save button when Enter is pressed
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    const tag = t.tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return; // allow buttons and textareas to handle Enter normally
    e.preventDefault();
    // Focus the save button
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.focus();
    }
  };

  // Use styles from formStyles and theme
  const labelStyles = formFieldStyles.label;

  return (
  <div className={pageContainerStyles.container}>
        <div className={pageContainerStyles.content}>
          <Card className={formFieldStyles.card.container}>
            <CardHeader className={theme.header.container}>
              <div className={theme.header.contentSpacing}>
                <CardTitle className={theme.header.main}>
                  {id ? t.editEvent : t.createEvent}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-gray-500">{t.loading}</div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" onKeyDown={handleKeyDown}>
                {/* Main Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Event Details Section */}
                  <div>
                    <Input 
                      id="title" 
                      className={cn(theme.input.base, theme.input.size.md)}
                      {...register('title', { required: t.eventTitle + ' ' + t.required })} 
                      placeholder={t.eventTitle + ' *'}
                      autoFocus
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                  </div>
                    
                  <div>
                    <Input 
                      id="date" 
                      type="date" 
                      className={cn(theme.input.base, theme.input.size.md)}
                      {...register('date', { required: t.date + ' ' + t.required })} 
                      placeholder={t.date + ' *'}
                    />
                    {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                  </div>
                  
                  <div>
                    <Input 
                      id="time" 
                      type="time" 
                      className={cn(theme.input.base, theme.input.size.md)}
                      {...register('time', { required: t.time + ' ' + t.required })} 
                      placeholder={t.time + ' *'}
                    />
                    {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>}
                  </div>
                    
                  <div>
                    <Input 
                      id="location" 
                      className={cn(theme.input.base, theme.input.size.md)}
                      {...register('location', { required: t.location + ' ' + t.required })} 
                      placeholder={t.location + ' *'}
                    />
                    {errors.location && <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>}
                  </div>

                  <div className="md:col-span-2 lg:col-span-3">
                    <Textarea 
                      id="description" 
                      className={cn(theme.textarea.base, theme.textarea.size.md)}
                      {...register('description', { required: t.description + ' ' + t.required })} 
                      placeholder={t.description + ' *'}
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
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
                                className={cn(theme.input.base, theme.input.size.md)}
                                placeholder={t.imageTitle} 
                                {...register(`images.${index}.title`)} 
                              />
                            </div>
                            <div>
                              <Textarea 
                                className={cn(theme.textarea.base, theme.textarea.size.md)}
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
                
                {/* Action Buttons */}
                <div className={formFieldStyles.eventForm.actionButtons}>
                 
                  <Button 
                    type="submit" 
                    className={formFieldStyles.eventForm.submitButton}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t.saving : (id ? t.updateEvent : t.createEvent)}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset()}
                    className="px-6 py-2.5 text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
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