import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import propertyService from '@/services/propertyService';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { formFieldStyles, pageContainerStyles } from '@/styles/formStyles';

interface PropertyFormData {
  id?: number;
  name: string;
  details: string;
  value: string;
  created_at?: string;
  updated_at?: string;
}

// Custom hook for Enter key navigation
const useEnterKeyNavigation = () => {
  const formRef = useRef<HTMLFormElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      if (!formRef.current) return;
      
      const focusableElements = formRef.current.querySelectorAll(
        'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]):not([readonly]), button:not([disabled])'
      );
      
      const currentElement = document.activeElement;
      const currentIndex = Array.from(focusableElements).indexOf(currentElement as Element);
      
      if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
        const nextElement = focusableElements[currentIndex + 1] as HTMLElement;
        nextElement.focus();
      }
    }
  };

  return { formRef, handleKeyDown };
};

export default function PropertyRegistrationForm() {
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PropertyFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { formRef, handleKeyDown } = useEnterKeyNavigation();

  const { language } = useLanguage();

  // Field styles
  const fieldStyles = formFieldStyles.input;
  const labelStyles = formFieldStyles.label;
  const textareaStyles = formFieldStyles.textarea;

  // Translation function
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const isEdit = Boolean(id);

  useEffect(() => {
    if (id) {
      const fetchProperty = async () => {
        setIsLoading(true);
        try {
          // Mock data for now - replace with actual API call
          const mockProperty: PropertyFormData = {
            name: 'Sample Property',
            details: 'Sample property details description',
            value: '100000'
          };
          reset(mockProperty);
        } catch (error) {
          console.error('Error fetching property:', error);
          setIsError(true);
          setMessage(t('Failed to load property data', 'சொத்து தகவலை ஏற்ற முடியவில்லை'));
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchProperty();
    }
  }, [id, reset, t]);

  // Auto-dismiss success messages
  useEffect(() => {
    if (message && !isError) {
      const timer = setTimeout(() => {
        setMessage(undefined);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, isError]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t('Loading property data...', 'சொத்து தகவல் ஏற்றுகிறது...')}</div>
      </div>
    );
  }

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setIsSubmitting(true);
      setMessage(undefined);
      setIsError(false);
      
      const payload = {
        name: data.name,
        details: data.details,
        value: data.value
      };

      if (id) {
        const propertyId = parseInt(id, 10);
        const propertyData = {
          ...payload,
          id: propertyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await propertyService.updateProperty(propertyId.toString(), propertyData);
        const successMsg = t('Property updated successfully', 'சொத்து வெற்றிகரமாக புதுப்பிக்கப்பட்டது');
        setMessage(successMsg);
        toast({ title: successMsg });
      } else {
        const propertyData = {
          ...payload,
          id: Date.now(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await propertyService.createProperty(propertyData);
        const successMsg = t('Property registered successfully', 'சொத்து வெற்றிகரமாக பதிவு செய்யப்பட்டது');
        setMessage(successMsg);
        toast({ title: successMsg });
        
        // Reset form for new entries
        reset({
          name: '',
          details: '',
          value: ''
        });
      }
      
      // Navigate to properties list after a short delay for edit mode
      if (id) {
        setTimeout(() => {
          navigate('/dashboard/properties');
        }, 1500);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setIsError(true);
      const errorMsg = t('Failed to submit property form', 'சொத்து படிவத்தை சமர்ப்பிக்க முடியவில்லை');
      setMessage(errorMsg);
      toast({
        title: t('Error', 'பிழை'),
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard/properties');
  };

  const handleClear = () => {
    reset({
      name: '',
      details: '',
      value: ''
    });
    setMessage(undefined);
    setIsError(false);
  };

  // Validation error messages
  const getValidationMessage = (field: string, type: string) => {
    const messages: Record<string, Record<string, { en: string; ta: string }>> = {
      name: {
        required: { en: 'Property name is required', ta: 'சொத்தின் பெயர் தேவை' },
        minLength: { en: 'Name must be at least 2 characters', ta: 'பெயர் குறைந்தது 2 எழுத்துகள் இருக்க வேண்டும்' }
      },
      value: {
        required: { en: 'Property value is required', ta: 'சொத்தின் மதிப்பு தேவை' },
        min: { en: 'Value must be positive', ta: 'மதிப்பு நேர்மறையாக இருக்க வேண்டும்' }
      },
      details: {
        required: { en: 'Property details are required', ta: 'சொத்து விவரங்கள் தேவை' },
        minLength: { en: 'Details must be at least 10 characters', ta: 'விவரங்கள் குறைந்தது 10 எழுத்துகள் இருக்க வேண்டும்' }
      }
    };
    
    return messages[field]?.[type] ? t(messages[field][type].en, messages[field][type].ta) : '';
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={pageContainerStyles.content}>
        <Card className={formFieldStyles.card.container}>
          <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white", formFieldStyles.card.header)}>
            <CardTitle className="text-2xl font-bold">
              {isEdit 
                ? t('Edit Property', 'சொத்து திருத்தம்') 
                : t('Property Registration', 'சொத்து பதிவு')
              }
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Message Display */}
            {message && (
              <Alert variant={isError ? 'destructive' : 'default'} className="mb-6">
                <AlertTitle>{isError ? t('Error', 'பிழை') : t('Success', 'வெற்றி')}</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-8">
              {/* Property Details Section */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  {t('Property Details', 'சொத்து விவரங்கள்')}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Property Name */}
                  <div className="md:col-span-2">
                    <Label className={labelStyles} htmlFor="name">
                      {t('Property Name', 'சொத்தின் பெயர்')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      {...register('name', { 
                        required: getValidationMessage('name', 'required'),
                        minLength: { 
                          value: 2, 
                          message: getValidationMessage('name', 'minLength')
                        }
                      })}
                      className={fieldStyles}
                      placeholder={t('Enter property name', 'சொத்தின் பெயரை உள்ளிடவும்')}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠</span>
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Property Value */}
                  <div>
                    <Label className={labelStyles} htmlFor="value">
                      {t('Property Value (₹)', 'சொத்தின் மதிப்பு (₹)')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="value"
                      type="number"
                      min="0"
                      step="0.01"
                      {...register('value', { 
                        required: getValidationMessage('value', 'required'),
                        min: { 
                          value: 0, 
                          message: getValidationMessage('value', 'min')
                        }
                      })}
                      className={fieldStyles}
                      placeholder={t('Enter property value', 'சொத்தின் மதிப்பை உள்ளிடவும்')}
                    />
                    {errors.value && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠</span>
                        {errors.value.message}
                      </p>
                    )}
                  </div>

                  {/* Property Details - Full width */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <Label className={labelStyles} htmlFor="details">
                      {t('Property Details', 'சொத்து விவரங்கள்')} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="details"
                      {...register('details', { 
                        required: getValidationMessage('details', 'required'),
                        minLength: { 
                          value: 10, 
                          message: getValidationMessage('details', 'minLength')
                        }
                      })}
                      rows={4}
                      className={textareaStyles}
                      placeholder={t(
                        'Enter detailed description of the property including location, specifications, and other relevant information',
                        'இடம், விவரக்குறிப்புகள் மற்றும் பிற தொடர்புடைய தகவல்கள் உட்பட சொத்தின் விரிவான விளக்கத்தை உள்ளிடவும்'
                      )}
                    />
                    {errors.details && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠</span>
                        {errors.details.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-between items-center pt-6 border-t border-gray-200">
                <div className="flex gap-3">
                  {/* Keyboard shortcut hint */}
                  <div className="text-sm text-gray-500 hidden md:flex items-center">
                    <kbd className="px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded">Enter</kbd>
                    <span className="ml-2">{t('to navigate', 'நகர்வதற்கு')}</span>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    className={cn(formFieldStyles.button.outline, "px-6 py-2")}
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    {t('Cancel', 'ரத்து')}
                  </Button>
                  
                  {!isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      className={cn(formFieldStyles.button.outline, "px-6 py-2")}
                      onClick={handleClear}
                      disabled={isSubmitting}
                    >
                      {t('Clear', 'அழி')}
                    </Button>
                  )}
                  
                  <Button
                    type="submit"
                    size="default"
                    className={cn("bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white", "px-8 py-2 min-w-[140px] rounded-md")}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('Saving...', 'சேமிக்கிறது...')}
                      </div>
                    ) : (
                      isEdit 
                        ? t('Update Property', 'சொத்தை புதுப்பி') 
                        : t('Register Property', 'சொத்து பதிவு')
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

      
      </div>
    </div>
  );
}
