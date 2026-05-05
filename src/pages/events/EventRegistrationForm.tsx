import React, { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { X, ImagePlus, Trash2, Calendar, Clock, MapPin, Type, AlignLeft, Plus } from 'lucide-react';
import eventService from '@/services/eventService';
import { Event, EventImage } from '@/types/event';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/lib/language';
import { formFieldStyles, pageContainerStyles, cn } from '@/styles/formStyles';
import { theme } from '@/styles/theme';

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
  // Track which image card is expanded for editing
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
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
        const formatDate = (d: any) => {
          if (!d) return '';
          try {
            return new Date(d).toISOString().slice(0, 10);
          } catch {
            return String(d).slice(0, 10);
          }
        };
        reset({
          title: data.title || '',
          description: data.description || '',
          fromDate: formatDate(data.fromDate || data.date),
          toDate: formatDate(data.toDate || data.fromDate || data.date),
          date: formatDate(data.date),
          time: data.time || '',
          location: data.location || '',
          images
        });
      } catch (err) {
        toast({ title: t.error, description: t.loadError, variant: 'destructive' });
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
        toast({ title: t.error, description: t.limitReached, variant: 'destructive' });
        return;
      }

      for (const file of newFiles) {
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
          toast({ title: t.error, description: t.invalidType, variant: 'destructive' });
          continue;
        }
        if (file.size > 2 * 1024 * 1024) {
          toast({ title: t.error, description: t.invalidSize, variant: 'destructive' });
          continue;
        }
        append({ file, title: '', caption: '' });
      }
    }
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
      toast({ title: t.error, description: t.submitError, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    const tag = target.tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return;
    e.preventDefault();
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) submitButton.focus();
  };

  const labelStyles = formFieldStyles.label;

  return (
    <div className={cn(pageContainerStyles.container, "bg-gradient-to-br from-orange-50/50 via-white to-red-50/30 py-4")}>
      <div className={pageContainerStyles.content}>
        <Card className={cn(formFieldStyles.card.container, "overflow-hidden border-none shadow-2xl")}>
          <CardHeader className={cn(theme.header.container, "py-3")}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={cn(theme.header.main, "text-xl tracking-tight")}>
                {id ? t.editEvent : t.createEvent}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-gray-500 font-medium animate-pulse">{t.loading}</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-10" onKeyDown={handleKeyDown}>
                {/* Main Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                        {...register('location', { required: t.location + ' ' + t.required })}
                        placeholder={t.location}
                      />
                    </div>
                    {errors.location && <p className="text-red-500 text-xs mt-1 font-medium">{errors.location.message}</p>}
                  </div>

                  <div className="relative group">
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

                {/* ── Event Images Section ── */}
                <div className="space-y-4 pt-6 border-t border-gray-100">
                  <Label className={cn(labelStyles, "transition-colors mb-2 block")}>
                    {t.eventImages}
                  </Label>

                  {/* Horizontal row: [Upload Button] [Card 1] [Card 2] ... */}
                  <div className="flex items-start gap-3 overflow-x-auto pb-2 pl-4">

                    {/* Hidden file input */}
                    <input
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png"
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {/* Upload trigger box — always visible */}
                    {imageFields.length < 5 && (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 transition-all duration-200 flex flex-col items-center justify-center gap-1 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-colors">
                          <Plus className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-[10px] text-orange-500 font-medium text-center leading-tight px-1">
                          {t.uploadImages}
                        </span>
                      </button>
                    )}

                    {/* Image mini-cards — one per uploaded image */}
                    {imageFields.map((field, index) => {
                      const anyField = field as unknown as EventImage;
                      const existingImageId = anyField.id;
                      const src = anyField.url || (anyField.file instanceof File ? URL.createObjectURL(anyField.file) : undefined);
                      const isExpanded = expandedIndex === index;

                      return (
                        <div
                          key={field.id}
                          className={cn(
                            "flex-shrink-0 relative rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all duration-300",
                            isExpanded
                              ? "w-56"
                              : "w-24 h-24 cursor-pointer hover:border-orange-300 hover:shadow-md"
                          )}
                          onClick={() => !isExpanded && setExpandedIndex(index)}
                        >
                          {/* Delete button */}
                          <button
                            type="button"
                            className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (existingImageId && typeof existingImageId === 'number') {
                                setDeletedImageIds(prev => [...prev, existingImageId]);
                              }
                              remove(index);
                              if (expandedIndex === index) setExpandedIndex(null);
                            }}
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>

                          {/* Thumbnail */}
                          {src ? (
                            <img
                              src={src}
                              alt={`Preview ${index + 1}`}
                              className={cn(
                                "object-cover w-full",
                                isExpanded ? "h-32" : "h-full"
                              )}
                            />
                          ) : (
                            <div className={cn(
                              "bg-gray-100 flex items-center justify-center w-full",
                              isExpanded ? "h-32" : "h-full"
                            )}>
                              <ImagePlus className="w-6 h-6 text-gray-300" />
                            </div>
                          )}

                          {/* Expanded: title + caption inputs */}
                          {isExpanded && (
                            <div className="p-2 space-y-2">
                              <Input
                                className="h-7 text-xs px-2 border-gray-200 bg-gray-50 focus:bg-white"
                                placeholder={t.imageTitle}
                                {...register(`images.${index}.title`)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Textarea
                                className="text-xs px-2 py-1 min-h-[40px] resize-none border-gray-200 bg-gray-50 focus:bg-white"
                                placeholder={t.imageCaption}
                                {...register(`images.${index}.caption`)}
                                rows={2}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                type="button"
                                className="w-full text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedIndex(null);
                                }}
                              >
                                ▲ collapse
                              </button>
                            </div>
                          )}

                          {/* Collapsed: image number badge */}
                          {!isExpanded && (
                            <div className="absolute bottom-1 left-1 bg-black/40 rounded px-1">
                              <span className="text-[10px] text-white font-medium">{index + 1}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Helper text */}
                  <p className="text-xs text-gray-400">{t.imageFormats}</p>
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
                      setExpandedIndex(null);
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