import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../lib/language';
import { theme } from '../../styles/theme';
import { cn } from '../../lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  
  const [orgName, setOrgName] = useState('Temple Trust');
  const [email, setEmail] = useState('info@templetrust.org');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('/api/org-settings');
        if (response.data.success && response.data.data) {
          setOrgName(response.data.data.org_name || 'Temple Trust');
          setEmail(response.data.data.contact_email || 'info@templetrust.org');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Translations object with English and Tamil
  const translations = {
    tamil: {
      "adminSettings": "Admin Settings",
      "organizationName": "Organization Name",
      "enterOrganizationName": "Enter organization name",
      "contactEmail": "Contact Email",
      "enterContactEmail": "Enter contact email",
      "onlyAdminsCanAccess": "Only admins can access this page. You are:",
      "save": "Save",
      "saving": "Saving...",
      "cancel": "Cancel",
      "settingsSavedSuccessfully": "Settings saved successfully",
      "failedToSaveSettings": "Failed to save settings",
      "success": "Success",
      "error": "Error",
      "generalSettings": "General Settings",
      "updateYourOrganizationDetails": "Update your organization details and contact information"
    },
    english: {
      "adminSettings": "நிர்வாக அமைப்புகள்",
      "organizationName": "அமைப்பு பெயர்",
      "enterOrganizationName": "அமைப்பு பெயரை உள்ளிடவும்",
      "contactEmail": "தொடர்பு மின்னஞ்சல்",
      "enterContactEmail": "தொடர்பு மின்னஞ்சலை உள்ளிடவும்",
      "onlyAdminsCanAccess": "நிர்வாகிகள் மட்டுமே இந்தப் பக்கத்தை அணுக முடியும். நீங்கள்:",
      "save": "சேமிக்கவும்",
      "saving": "சேமிக்கிறது...",
      "cancel": "ரத்து செய்",
      "settingsSavedSuccessfully": "அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன",
      "failedToSaveSettings": "அமைப்புகளை சேமிக்க முடியவில்லை",
      "success": "வெற்றி",
      "error": "பிழை",
      "generalSettings": "பொது அமைப்புகள்",
      "updateYourOrganizationDetails": "உங்கள் அமைப்பு விவரங்கள் மற்றும் தொடர்பு தகவல்களை புதுப்பிக்கவும்"
    }
  };

  // Translation helper function
  const t = (key: keyof typeof translations.english): string => {
    const currentTranslations = translations[language as keyof typeof translations] || translations.english;
    return currentTranslations[key] || translations.english[key] || key;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await axios.put('/api/org-settings', {
        org_name: orgName,
        contact_email: email,
      });
      
      if (response.data.success) {
        toast({
          title: t('success'),
          description: t('settingsSavedSuccessfully'),
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('error'),
        description: t('failedToSaveSettings'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      const response = await axios.get('/api/org-settings');
      if (response.data.success && response.data.data) {
        setOrgName(response.data.data.org_name || 'Temple Trust');
        setEmail(response.data.data.contact_email || 'info@templetrust.org');
      } else {
        setOrgName('Temple Trust');
        setEmail('info@templetrust.org');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      setOrgName('Temple Trust');
      setEmail('info@templetrust.org');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-orange-900">
          {t('adminSettings')}
        </h2>
      </div>
      
      <Card className="border-orange-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-orange-900">
            {t('generalSettings')}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {t('updateYourOrganizationDetails')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Organization Name */}
          <div className="space-y-2">
            <Label htmlFor="orgName" className="text-sm text-gray-700">
              {t('organizationName')}
            </Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={t('enterOrganizationName')}
              className={cn(theme.input.base, "w-full")}
            />
          </div>
          
          {/* Contact Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-gray-700">
              {t('contactEmail')}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('enterContactEmail')}
              className={cn(theme.input.base, "w-full")}
            />
          </div>
          
          {/* User Role Info */}
          <div className="text-sm text-gray-500 pt-2 border-t border-gray-100">
            {t('onlyAdminsCanAccess')}{' '}
            <span className="font-semibold capitalize text-orange-700">
              {user?.role}
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "px-6 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors",
                isSaving && "opacity-70 cursor-not-allowed"
              )}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('saving')}
                </span>
              ) : (
                t('save')
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className={cn(
                theme.input.base,
                "px-6 py-2 rounded-lg bg-white hover:bg-orange-50 border-gray-300 text-gray-700"
              )}
            >
              {t('cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}