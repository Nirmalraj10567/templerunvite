import React, { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { X, ImagePlus, Trash2, Calendar, Clock, MapPin, Type, AlignLeft } from 'lucide-react';
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
    createEvent1: 'Create',
    editEvent: 'Edit Event',
    eventDetails: 'Event Details',
    eventTitle: 'Event Title',
    description: 'Description',
    date: 'Date',
    fromDate: 'From Date',
    toDate: 'To Date',
    time: 'Time',
    location: 'Location',
    eventImages: 'Event Images',
    uploadImages: 'Upload Images',
    imageFormats: 'PNG, JPG up to 2MB (Max 5 images)',
    imageTitle: 'Image Title',
    imageCaption: 'Image Caption',
    cancel: 'Cancel',
    saving: 'Saving...',
    updateEvent: 'Update Event',
    updateEvent1: 'Update',
    loading: 'Loading...',
    success: 'successfully',
    error: 'Error',
    submitError: 'Failed to submit event',
    loadError: 'Failed to load event details',
    required: 'is required',
    limitReached: 'Maximum 5 images allowed',
    invalidType: 'Only JPG and PNG images are allowed',
    invalidSize: 'Each image must be less than 2MB'
  },
  english: {
    createEvent: 'நிகழ்வை உருவாக்கு',
    createEvent1: 'உருவாக்கு',
    editEvent: 'நிகழ்வைத் திருத்து',
    eventDetails: 'நிகழ்வு விவரங்கள்',
    eventTitle: 'நிகழ்வு தலைப்பு',
    description: 'விளக்கம்',
    date: 'தேதி',
    fromDate: 'தொடக்க தேதி',
    toDate: 'முடிவு தேதி',
    time: 'நேரம்',
    location: 'இடம்',
    eventImages: 'நிகழ்வு படங்கள்',
    uploadImages: 'படங்களை பதிவேற்று',
    imageFormats: 'PNG, JPG 2MB வரை (அதிகபட்சம் 5 படங்கள்)',
    imageTitle: 'படம் தலைப்பு',
    imageCaption: 'படம் விளக்கம்',
    cancel: 'ரத்து செய்',
    saving: 'சேமிக்கிறது...',
    updateEvent: 'நிகழ்வைப் புதுப்பி',
    updateEvent1: 'புதுப்பி',
    loading: 'ஏற்றுகிறது...',
    success: 'வெற்றிகரமாக',
    error: 'பிழை',
    submitError: 'நிகழ்வை சமர்ப்பிக்க முடியவில்லை',
    loadError: 'நிகழ்வு விவரங்களை ஏற்ற முடியவில்லை',
    required: 'தேவை',
    limitReached: 'அதிகபட்சம் 5 படங்கள் அனுமதிக்கப்படுகின்றன',
    invalidType: 'JPG மற்றும் PNG படங்கள் மட்டுமே அனுமதிக்கப்படுகின்றன',
    invalidSize: 'ஒவ்வொரு படமும் 2MB க்கும் குறைவாக இருக்க வேண்டும்'
  }
} as const;

export default function EventRegistrationForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originalImages, setOriginalImages] = useState<EventImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
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
      fromDate: new Date().toISOString().slice(0, 10),
      toDate: new Date().toISOString().slice(0, 10),
      date: new Date().toISOString().slice(0, 10),
      time: (() => {
        const now = new Date();
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      })(),
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
        const images = (data.images || []).map((img) => ({
          id: img.id,
          url: img.url,
          title: img.title || '',
          caption: img.caption || ''
        } as EventImage));
        setOriginalImages(images);
        reset({
          title: data.title || '',
          description: data.description || '',
          fromDate: data.fromDate || data.date || '',
          toDate: data.toDate || data.fromDate || data.date || '',
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
  }, [id, reset, t.error, t.loadError]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const currentImagesCount = imageFields.length;
      const newFiles = Array.from(files);
      
      if (currentImagesCount + newFiles.length > 5) {
        toast({
          title: t.error,
          description: t.limitReached,
          variant: 'destructive'
        });
        return;
      }

      for (const file of newFiles) {
        // Type check
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
          toast({
            title: t.error,
            description: t.invalidType,
            variant: 'destructive'
          });
          continue;
        }

        // Size check (2MB = 2 * 1024 * 1024 bytes)
        if (file.size > 2 * 1024 * 1024) {
          toast({
            title: t.error,
            description: t.invalidSize,
            variant: 'destructive'
          });
          continue;
        }

        append({
          file,
          title: '',
          caption: ''
        });
      }
    }
    // Clear input so same file can be uploaded again if deleted
    if (event.target) event.target.value = '';
  };

  const onSubmit = async (data: Event) => {
    try {
      setIsSubmitting(true);
      if (id) {
        await eventService.updateEvent(id, data, deletedImageIds);
        toast({ title: t.updateEvent + ' ' + t.success });
      } else {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    const tag = t.tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return;
    e.preventDefault();
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.focus();
    }
  };

  const labelStyles = formFieldStyles.label;

  return (
    <div className={cn(pageContainerStyles.container, "bg-gradient-to-br from-orange-50/50 via-white to-red-50/30 py-8")}>
      <div className={pageContainerStyles.content}>
        <Card className={cn(formFieldStyles.card.container, "overflow-hidden border-none shadow-2xl")}>
          <CardHeader className={cn(theme.header.container, "py-6")}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={cn(theme.header.main, "text-2xl tracking-tight")}>
                {id ? t.editEvent : t.createEvent}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-gray-500 font-medium animate-pulse">{t.loading}</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-10" onKeyDown={handleKeyDown}>
                {/* Main Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  
                  {/* Event Details Section */}
                  <div className="relative group">
                    <Label className={cn(labelStyles, "group-focus-within:text-orange-600 transition-colors mb-2 block")}>{t.eventTitle}</Label>
                    <div className="relative">
                      <Type className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors z-10 pointer-events-none" />
                      <Input 
                        id="title" 
                        className={cn(theme.input.base, theme.input.size.md, "pl-12 bg-gray-50/50 border-gray-200 focus:bg-white")}
                        {...register('title', { required: t.eventTitle + ' ' + t.required })} 
                        placeholder={t.eventTitle}
                        autoFocus
                      />
                    </div>
                    {errors.title && <p className="text-red-500 text-xs mt-1 font-medium">{errors.title.message}</p>}
                  </div>
                    
                  <div className="relative group">
                    <Label className={cn(labelStyles, "group-focus-within:text-orange-600 transition-colors mb-2 block")}>{t.fromDate}</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors z-10 pointer-events-none" />
                      <Input 
                        id="fromDate" 
                        type="date" 
                        className={cn(theme.input.base, theme.input.size.md, "pl-12 bg-gray-50/50 border-gray-200 focus:bg-white", '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')}
                        {...register('fromDate', { required: t.fromDate + ' ' + t.required })} 
                        onClick={(e) => (e.target as any).showPicker?.()}
                        placeholder={t.fromDate}
                      />
                    </div>
                    {errors.fromDate && <p className="text-red-500 text-xs mt-1 font-medium">{errors.fromDate.message}</p>}
                  </div>

                  <div className="relative group">
                    <Label className={cn(labelStyles, "group-focus-within:text-orange-600 transition-colors mb-2 block")}>{t.toDate}</Label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors z-10 pointer-events-none" />
                      <Input 
                        id="toDate" 
                        type="date" 
                        className={cn(theme.input.base, theme.input.size.md, "pl-12 bg-gray-50/50 border-gray-200 focus:bg-white", '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')}
                        {...register('toDate', { required: t.toDate + ' ' + t.required })} 
                        onClick={(e) => (e.target as any).showPicker?.()}
                        placeholder={t.toDate}
                      />
                    </div>
                    {errors.toDate && <p className="text-red-500 text-xs mt-1 font-medium">{errors.toDate.message}</p>}
                  </div>
                  
                  <div className="relative group">
                    <Label className={cn(labelStyles, "group-focus-within:text-orange-600 transition-colors mb-2 block")}>{t.time}</Label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors z-10 pointer-events-none" />
                      <Input 
                        id="time" 
                        type="time" 
                        className={cn(theme.input.base, theme.input.size.md, "pl-12 bg-gray-50/50 border-gray-200 focus:bg-white", '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer')}
                        {...register('time', { required: t.time + ' ' + t.required })} 
                        onClick={(e) => (e.target as any).showPicker?.()}
                        placeholder={t.time}
                      />
                    </div>
                    {errors.time && <p className="text-red-500 text-xs mt-1 font-medium">{errors.time.message}</p>}
                  </div>
                    
                  <div className="relative group">
                    <Label className={cn(labelStyles, "group-focus-within:text-orange-600 transition-colors mb-2 block")}>{t.location}</Label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors z-10 pointer-events-none" />
                      <Input 
                        id="location" 
                        className={cn(theme.input.base, theme.input.size.md, "pl-12 bg-gray-50/50 border-gray-200 focus:bg-white")}
                        {...register('location')} 
                        placeholder={t.location}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 lg:col-span-2 relative group">
                    <Label className={cn(labelStyles, "group-focus-within:text-orange-600 transition-colors mb-2 block")}>{t.description}</Label>
                    <div className="relative">
                      <AlignLeft className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors z-10 pointer-events-none" />
                      <Input 
                        id="description" 
                        className={cn(theme.input.base, theme.input.size.md, "pl-12 bg-gray-50/50 border-gray-200 focus:bg-white")}
                        {...register('description')} 
                        placeholder={t.description}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Event Images Section */}
                <div className="space-y-6 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <Label className={cn(labelStyles, "text-lg font-semibold text-gray-800")}>
                      {t.eventImages}
                    </Label>
                  </div>
                  
                    <div 
                      className={formFieldStyles.eventForm.imageUpload.container}
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <input 
                        type="file" 
                        multiple 
                        accept=".jpg,.jpeg,.png" 
                        ref={imageInputRef}
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <ImagePlus className="w-8 h-8 text-orange-600" />
                      </div>
                      <div className="text-center">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className={cn(formFieldStyles.eventForm.imageUpload.button, "pointer-events-none")}
                        >
                          {t.uploadImages}
                        </Button>
                        <p className={formFieldStyles.eventForm.imageUpload.helpText}>
                          {t.imageFormats}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {imageFields.length > 0 && (
                    <div className={formFieldStyles.eventForm.imagePreview.grid}>
                      {imageFields.map((field, index) => {
                        const anyField = field as unknown as EventImage;
                        const existingImageId = anyField.id;
                        return (
                          <div key={field.id} className={formFieldStyles.eventForm.imagePreview.item}>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className={formFieldStyles.eventForm.imagePreview.deleteButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (existingImageId && typeof existingImageId === 'number') {
                                  setDeletedImageIds(prev => [...prev, existingImageId]);
                                }
                                remove(index);
                              }}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                            
                            {(() => {
                              const src = anyField.url || (anyField.file instanceof File ? URL.createObjectURL(anyField.file) : undefined);
                              return src ? (
                                <div className="w-full">
                                  <img 
                                    src={src}
                                    alt={`Preview ${index}`}
                                    className={formFieldStyles.eventForm.imagePreview.image}
                                  />
                                </div>
                              ) : (
                                <div className="w-full aspect-video md:aspect-[21/9] bg-gray-100 flex items-center justify-center border-b border-gray-100">
                                  <ImagePlus className="w-12 h-12 text-gray-300" />
                                </div>
                              );
                            })()}
                          
                            <div className={formFieldStyles.eventForm.imagePreview.form}>
                              <div className="space-y-3">
                                <div className="relative group/field">
                                  <div className="relative">
                                    <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within/field:text-orange-500 transition-colors z-10 pointer-events-none" />
                                    <Input 
                                      className={cn(theme.input.base, "h-9 text-sm pl-9 bg-white border-gray-200")}
                                      placeholder={t.imageTitle} 
                                      {...register(`images.${index}.title`)} 
                                    />
                                  </div>
                                </div>
                                <div className="relative group/field">
                                  <div className="relative">
                                    <AlignLeft className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400 group-focus-within/field:text-orange-500 transition-colors z-10 pointer-events-none" />
                                    <Textarea 
                                      className={cn(theme.textarea.base, "pl-9 min-h-[36px] py-1.5 text-sm resize-none bg-white border-gray-200")}
                                      placeholder={t.imageCaption} 
                                      {...register(`images.${index}.caption`)} 
                                      rows={1}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className={cn(formFieldStyles.eventForm.actionButtons, "mt-12")}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset();
                      setOriginalImages([]);
                      setDeletedImageIds([]);
                    }}
                    className="px-8 py-3 text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t.cancel}
                  </Button>
                  <Button 
                    type="submit" 
                    className={cn(formFieldStyles.eventForm.submitButton, "px-10 py-3 text-lg")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        {t.saving}
                      </span>
                    ) : (id ? t.updateEvent1 : t.createEvent1)}
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