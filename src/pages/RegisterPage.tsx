import React, { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { X, ImagePlus, Calendar, Clock, MapPin, Type, AlignLeft, Plus, ChevronUp } from 'lucide-react';
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
    uploadImages: 'Add Image',
    imageFormats: 'PNG, JPG up to 2MB · Max 5 images',
    imageTitle: 'Image title...',
    imageCaption: 'Caption...',
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
    uploadImages: 'படம் சேர்',
    imageFormats: 'PNG, JPG 2MB வரை · அதிகபட்சம் 5 படங்கள்',
    imageTitle: 'படம் தலைப்பு...',
    imageCaption: 'விளக்கம்...',
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

// ── Compact field wrapper ──────────────────────────────────────────────────
function Field({
  label,
  icon: Icon,
  error,
  children,
  className
}: {
  label: string;
  icon: React.ElementType;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1">
        <Icon className="w-3 h-3 text-orange-400" />
        {label}
      </Label>
      {children}
      {error && <p className="text-red-500 text-[11px] font-medium">{error}</p>}
    </div>
  );
}

const inputCls =
  'h-9 text-sm border-gray-200 bg-gray-50/80 focus:bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-200 rounded-lg transition-all placeholder:text-gray-300';

const datePickerCls = cn(
  inputCls,
  'relative',
  '[&::-webkit-calendar-picker-indicator]:opacity-0',
  '[&::-webkit-calendar-picker-indicator]:absolute',
  '[&::-webkit-calendar-picker-indicator]:right-0',
  '[&::-webkit-calendar-picker-indicator]:w-full',
  '[&::-webkit-calendar-picker-indicator]:h-full',
  '[&::-webkit-calendar-picker-indicator]:cursor-pointer'
);

// ──────────────────────────────────────────────────────────────────────────

export default function EventRegistrationForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originalImages, setOriginalImages] = useState<EventImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<number[]>([]);
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

  const { fields: imageFields, append, remove } = useFieldArray({ control, name: 'images' });

  useEffect(() => {
    const loadEvent = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await eventService.getEventById(id);
        const images = (data.images || []).map(
          (img) => ({ id: img.id, url: img.url, title: img.title || '', caption: img.caption || '' } as EventImage)
        );
        setOriginalImages(images);
        const fmt = (d: any) => {
          if (!d) return '';
          try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d).slice(0, 10); }
        };
        reset({
          title: data.title || '',
          description: data.description || '',
          fromDate: fmt(data.fromDate || data.date),
          toDate: fmt(data.toDate || data.fromDate || data.date),
          date: fmt(data.date),
          time: data.time || '',
          location: data.location || '',
          images
        });
      } catch {
        toast({ title: t.error, description: t.loadError, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    loadEvent();
  }, [id, reset, t.error, t.loadError]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newFiles = Array.from(files);
    if (imageFields.length + newFiles.length > 5) {
      toast({ title: t.error, description: t.limitReached, variant: 'destructive' });
      return;
    }
    for (const file of newFiles) {
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        toast({ title: t.error, description: t.invalidType, variant: 'destructive' }); continue;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: t.error, description: t.invalidSize, variant: 'destructive' }); continue;
      }
      append({ file, title: '', caption: '' });
    }
    if (e.target) e.target.value = '';
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
    } catch {
      toast({ title: t.error, description: t.submitError, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const tag = (e.target as HTMLElement).tagName?.toLowerCase();
    if (!tag || ['button', 'textarea'].includes(tag)) return;
    e.preventDefault();
    (e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement)?.focus();
  };

  return (
    <div className={cn(pageContainerStyles.container, 'bg-gradient-to-br from-orange-50/40 via-white to-red-50/20 py-6')}>
      <div className={cn(pageContainerStyles.content, 'max-w-2xl')}>
        <Card className="border border-orange-100 shadow-xl rounded-2xl overflow-hidden">

          {/* ── Header ── */}
          <CardHeader className={cn(theme.header.container, 'px-6 py-4')}>
            <div className="flex items-center gap-2.5">
              <div className="w-0.5 h-6 rounded-full bg-white/50" />
              <CardTitle className={cn(theme.header.main, 'text-lg font-bold tracking-tight')}>
                {id ? t.editEvent : t.createEvent}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-9 h-9 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400 animate-pulse">{t.loading}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" onKeyDown={handleKeyDown}>

                {/* ── Section tag ── */}
                <SectionTag label={t.eventDetails} />

                {/* ── Title (full width) ── */}
                <Field label={t.eventTitle} icon={Type} error={errors.title?.message}>
                  <Input
                    className={inputCls}
                    {...register('title', { required: t.eventTitle + ' ' + t.required })}
                    placeholder={t.eventTitle}
                    autoFocus
                  />
                </Field>

                {/* ── From / To / Time ── */}
                <div className="grid grid-cols-3 gap-3">
                  <Field label={t.fromDate} icon={Calendar} error={errors.fromDate?.message}>
                    <Input
                      type="date"
                      className={datePickerCls}
                      {...register('fromDate', { required: t.fromDate + ' ' + t.required })}
                      onClick={(e) => (e.target as any).showPicker?.()}
                    />
                  </Field>
                  <Field label={t.toDate} icon={Calendar} error={errors.toDate?.message}>
                    <Input
                      type="date"
                      className={datePickerCls}
                      {...register('toDate', { required: t.toDate + ' ' + t.required })}
                      onClick={(e) => (e.target as any).showPicker?.()}
                    />
                  </Field>
                  <Field label={t.time} icon={Clock} error={errors.time?.message}>
                    <Input
                      type="time"
                      className={datePickerCls}
                      {...register('time', { required: t.time + ' ' + t.required })}
                      onClick={(e) => (e.target as any).showPicker?.()}
                    />
                  </Field>
                </div>

                {/* ── Location + Description ── */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t.location} icon={MapPin} error={errors.location?.message}>
                    <Input
                      className={inputCls}
                      {...register('location', { required: t.location + ' ' + t.required })}
                      placeholder={t.location}
                    />
                  </Field>
                  <Field label={t.description} icon={AlignLeft}>
                    <Input
                      className={inputCls}
                      {...register('description')}
                      placeholder={t.description}
                    />
                  </Field>
                </div>

                {/* ── Images Section ── */}
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionTag label={t.eventImages} />
                    <span className="text-[11px] text-gray-300">{t.imageFormats}</span>
                  </div>

                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png"
                    ref={imageInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* Row: [fixed upload btn] + [scrollable cards] */}
                  <div className="flex items-start gap-2.5">

                    {/* Upload button — flex-none */}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={imageFields.length >= 5}
                      className="flex-none w-[72px] h-[72px] rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 hover:bg-orange-100 hover:border-orange-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex flex-col items-center justify-center gap-1 group"
                    >
                      <div className="w-6 h-6 rounded-full bg-orange-100 group-hover:bg-orange-200 group-hover:scale-110 flex items-center justify-center transition-all">
                        <Plus className="w-3 h-3 text-orange-600" />
                      </div>
                      <span className="text-[9px] text-orange-500 font-semibold text-center leading-tight px-1">
                        {t.uploadImages}
                      </span>
                    </button>

                    {/* Scrollable image cards */}
                    <div className="flex items-start gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
                      {imageFields.length === 0 && (
                        <div className="flex items-center gap-2 h-[72px] px-2">
                          <ImagePlus className="w-4 h-4 text-gray-200" />
                          <span className="text-xs text-gray-200 italic">No images yet</span>
                        </div>
                      )}

                      {imageFields.map((field, index) => {
                        const anyField = field as unknown as EventImage;
                        const existingImageId = anyField.id;
                        const src = anyField.url || (anyField.file instanceof File ? URL.createObjectURL(anyField.file) : undefined);
                        const isExpanded = expandedIndex === index;

                        return (
                          <div
                            key={field.id}
                            className={cn(
                              'flex-none relative rounded-xl border bg-white overflow-hidden transition-all duration-300',
                              isExpanded
                                ? 'w-48 border-orange-300 shadow-md shadow-orange-50'
                                : 'w-[72px] h-[72px] border-gray-200 cursor-pointer hover:border-orange-300 hover:shadow-sm'
                            )}
                            onClick={() => !isExpanded && setExpandedIndex(index)}
                          >
                            {/* Delete */}
                            <button
                              type="button"
                              className="absolute top-1 right-1 z-10 w-[16px] h-[16px] rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (existingImageId && typeof existingImageId === 'number') {
                                  setDeletedImageIds(prev => [...prev, existingImageId]);
                                }
                                remove(index);
                                if (expandedIndex === index) setExpandedIndex(null);
                                else if (expandedIndex !== null && expandedIndex > index) setExpandedIndex(expandedIndex - 1);
                              }}
                            >
                              <X className="w-2 h-2 text-white" />
                            </button>

                            {/* Image */}
                            {src ? (
                              <img
                                src={src}
                                alt={`img ${index + 1}`}
                                className={cn('object-cover w-full', isExpanded ? 'h-24' : 'h-full')}
                              />
                            ) : (
                              <div className={cn('bg-gray-100 flex items-center justify-center w-full', isExpanded ? 'h-24' : 'h-full')}>
                                <ImagePlus className="w-4 h-4 text-gray-300" />
                              </div>
                            )}

                            {/* Expanded inputs */}
                            {isExpanded && (
                              <div className="p-2 space-y-1.5">
                                <Input
                                  className="h-7 text-xs px-2 border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-300 rounded-md"
                                  placeholder={t.imageTitle}
                                  {...register(`images.${index}.title`)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <Textarea
                                  className="text-xs px-2 py-1 min-h-[32px] resize-none border-gray-200 bg-gray-50 focus:bg-white focus:border-orange-300 rounded-md"
                                  placeholder={t.imageCaption}
                                  {...register(`images.${index}.caption`)}
                                  rows={2}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  type="button"
                                  className="w-full flex items-center justify-center gap-0.5 text-[10px] text-gray-300 hover:text-orange-400 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); setExpandedIndex(null); }}
                                >
                                  <ChevronUp className="w-3 h-3" /> collapse
                                </button>
                              </div>
                            )}

                            {/* Badge */}
                            {!isExpanded && (
                              <div className="absolute bottom-1 left-1 bg-black/40 rounded px-1 py-px">
                                <span className="text-[9px] text-white font-bold leading-none">{index + 1}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Action Buttons ── */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset();
                      setOriginalImages([]);
                      setDeletedImageIds([]);
                      setExpandedIndex(null);
                    }}
                    className="h-9 px-4 text-sm text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5 mr-1.5" />
                    {t.cancel}
                  </Button>
                  <Button
                    type="submit"
                    className={cn(formFieldStyles.eventForm.submitButton, 'h-9 px-6 text-sm rounded-lg')}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-1.5">
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

// ── Section tag helper ─────────────────────────────────────────────────────
function SectionTag({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1 h-1 rounded-full bg-orange-500 inline-block" />
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}