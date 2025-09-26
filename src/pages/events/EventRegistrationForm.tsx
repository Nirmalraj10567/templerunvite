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

  // Consistent field styling
  const fieldStyles = "text-base py-2.5 px-3 h-11 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-md w-full transition-all duration-200";
  const labelStyles = "block text-sm font-medium mb-1.5 text-gray-700";
  const textareaStyles = "text-base py-2.5 px-3 border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 rounded-md w-full transition-all duration-200 min-h-[100px]";

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <Card className="shadow-lg border-0 bg-white rounded-lg">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6 rounded-t-lg">
            <CardTitle className="text-2xl font-bold text-center">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Event Details Section */}
                  <div className="space-y-6">
                    <div>
                      <Label className={labelStyles} htmlFor="title">
                        {t.eventTitle} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="title" 
                        className={fieldStyles}
                        {...register('title', { required: t.eventTitle + ' ' + t.required })} 
                        placeholder={t.eventTitle}
                      />
                      {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                    </div>
                    
                    <div>
                      <Label className={labelStyles} htmlFor="description">
                        {t.description} <span className="text-red-500">*</span>
                      </Label>
                      <Textarea 
                        id="description" 
                        className={textareaStyles}
                        {...register('description', { required: t.description + ' ' + t.required })} 
                        placeholder={t.description}
                      />
                      {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className={labelStyles} htmlFor="date">
                          {t.date} <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="date" 
                          type="date" 
                          className={fieldStyles}
                          {...register('date', { required: t.date + ' ' + t.required })} 
                        />
                        {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                      </div>
                      
                      <div>
                        <Label className={labelStyles} htmlFor="time">
                          {t.time} <span className="text-red-500">*</span>
                        </Label>
                        <Input 
                          id="time" 
                          type="time" 
                          className={fieldStyles}
                          {...register('time', { required: t.time + ' ' + t.required })} 
                        />
                        {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>}
                      </div>
                    </div>
                    
                    <div>
                      <Label className={labelStyles} htmlFor="location">
                        {t.location} <span className="text-red-500">*</span>
                      </Label>
                      <Input 
                        id="location" 
                        className={fieldStyles}
                        {...register('location', { required: t.location + ' ' + t.required })} 
                        placeholder={t.location}
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
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors">
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
                          className="px-4 py-2 text-sm border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <ImagePlus className="mr-2 h-4 w-4" /> {t.uploadImages}
                        </Button>
                        <p className="text-xs text-gray-500 mt-2">
                          {t.imageFormats}
                        </p>
                      </div>
                    </div>
                    
                    {imageFields.length > 0 && (
                      <div className="grid grid-cols-1 gap-4">
                        {imageFields.map((field, index) => (
                          <div key={field.id} className="relative border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="absolute top-2 right-2 h-8 w-8 bg-white hover:bg-red-50 hover:text-red-600"
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
                                    className="w-full h-40 object-cover rounded-md"
                                    onLoad={() => {
                                      if (anyField.file instanceof File) {
                                        URL.revokeObjectURL(src);
                                      }
                                    }}
                                  />
                                </div>
                              ) : null;
                            })()}
                            
                            <div className="space-y-3">
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">
                                  {t.imageTitle}
                                </Label>
                                <Input 
                                  className="text-sm py-2 px-3 h-9"
                                  placeholder={t.imageTitle} 
                                  {...register(`images.${index}.title`)} 
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600 mb-1 block">
                                  {t.imageCaption}
                                </Label>
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
                <div className="flex flex-wrap gap-4 justify-end pt-6 border-t border-gray-200">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="px-5 py-2.5 text-base border hover:bg-gray-50 rounded-md"
                    onClick={() => navigate('/dashboard/events')}
                  >
                    {t.cancel}
                  </Button>
                  <Button 
                    type="submit" 
                    className="px-5 py-2.5 text-base bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md"
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