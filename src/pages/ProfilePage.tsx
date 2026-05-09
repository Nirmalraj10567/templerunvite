import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../lib/language';
import { updateProfile, ProfileUpdateData } from '../lib/apiClient';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const RAW_API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || window.location.origin;
const NORMALIZED_API_BASE = RAW_API_BASE.replace(/\/+$/, '');
const API_BASE = NORMALIZED_API_BASE.endsWith('/api')
  ? NORMALIZED_API_BASE
  : `${NORMALIZED_API_BASE}/api`;
const API_ORIGIN = API_BASE.replace(/\/api$/, '');

const resolveImageUrl = (value?: string | null) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const normalized = value.startsWith('/') ? value : `/${value}`;
  return `${API_ORIGIN}${normalized}`;
};

export default function ProfilePage() {
  const { user, temple } = useAuth();
  const { language } = useLanguage();
  const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';

  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    fullName: '',
    firstName: '',
    lastName: '',
    templeName: '',
    websiteLink: '',
    panNumber: '',
    tanNumber: '',
    gstNumber: '',
    trustType: '',
    isTrust: false,
    reg12A: '',
    reg80G: '',
    profileImage: '',
  });

  const [imagePreview, setImagePreview] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const t = {
    tamil: {
      profile: 'சுயசரிப்பு',
      personalInfo: 'தனிப்பட்ட தகவல்கள்',
      templeInfo: 'கோவில் தகவல்கள்',
      email: 'மின்னஞ்சல்',
      fullName: 'முழுப்பெயர்',
      website: 'வலைத்தளம்',
      panNumber: 'PAN எண்',
      tanNumber: 'TAN எண்',
      gstNumber: 'GST எண்',
      trustType: 'அறக்கட்டளை வகை',
      isTrust: 'அறக்கட்டளை',
      reg12A: '12A பதிவு',
      reg80G: '80G பதிவு',
      currentPassword: 'தற்போதைய கடவுச்சொல்',
      newPassword: 'புதிய கடவுச்சொல்',
      confirmPassword: 'கடவுச்சொல் உறுதிப்படுத்தவும்',
      changePassword: 'கடவுச்சொல் மாற்று',
      save: 'சேமி',
      saving: 'சேமிக்கிறது...',
      success: 'வெற்றிகரமாக சேமிக்கப்பட்டது',
      error: 'பிழை ஏற்பட்டது',
      passwordMismatch: 'கடவுச்சொல் பொருந்தவில்லை',
      passwordLength: 'கடவுச்சொல் குறைந்தது 8 எழுத்துகள்',
      close: 'மூடு',
      trustTypePublic: 'பொது அறக்கட்டளை',
      trustTypeReligious: 'மத அறக்கட்டளை',
      trustTypePrivate: 'தனியார் அறக்கட்டளை',
    },
    english: {
      profile: 'Profile',
      personalInfo: 'Personal Information',
      templeInfo: 'Temple Information',
      email: 'Email',
      fullName: 'Full Name',
      website: 'Website',
      panNumber: 'PAN Number',
      tanNumber: 'TAN Number',
      gstNumber: 'GST Number',
      trustType: 'Trust Type',
      isTrust: 'Is Trust',
      reg12A: '12A Registration',
      reg80G: '80G Registration',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
      changePassword: 'Change Password',
      save: 'Save',
      saving: 'Saving...',
      success: 'Saved successfully',
      error: 'An error occurred',
      passwordMismatch: 'Passwords do not match',
      passwordLength: 'Password must be at least 8 characters',
      close: 'Close',
      trustTypePublic: 'Public Charitable Trust',
      trustTypeReligious: 'Religious Trust',
      trustTypePrivate: 'Private Trust',
    },
  } as const;

  useEffect(() => {
    if (user) {
      const currentUser = user as any;
      const templeInfo = temple as any;
      const fallbackFullName =
        currentUser.full_name ||
        currentUser.fullName ||
        currentUser.name ||
        '';
      const [firstName = '', ...rest] = String(fallbackFullName).trim().split(/\s+/).filter(Boolean);
      const lastName = rest.join(' ');

      setFormData(prev => ({
        ...prev,
        email: currentUser.email || '',
        mobile: currentUser.mobile || '',
        fullName: fallbackFullName,
        firstName,
        lastName,
        templeName: currentUser.templeName || templeInfo?.name || '',
        profileImage: resolveImageUrl(currentUser.profile_image || ''),
        websiteLink: currentUser.templeWebsite || '',
        panNumber: currentUser.pan_number || '',
        tanNumber: currentUser.tan_number || '',
        gstNumber: currentUser.gst_number || '',
        trustType: currentUser.trust_type || '',
        isTrust: Boolean(currentUser.is_trust),
        reg12A: currentUser.reg_12a || '',
        reg80G: currentUser.reg_80g || '',
      }));
      if (currentUser.profile_image) {
        setImagePreview(resolveImageUrl(currentUser.profile_image));
      }
    }
  }, [user, temple]);

  useEffect(() => {
    const loadLatestProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const response = await fetch(`${API_BASE}/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) return;
        const result = await response.json();
        const profile = result?.user;
        if (!profile) return;

        const fullNameValue = profile.full_name || profile.fullName || '';
        const [firstName = '', ...rest] = String(fullNameValue).trim().split(/\s+/).filter(Boolean);
        const lastName = rest.join(' ');

        setFormData(prev => ({
          ...prev,
          email: profile.email || prev.email,
          mobile: profile.mobile || prev.mobile,
          fullName: fullNameValue || prev.fullName,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          templeName: profile.templeName || prev.templeName,
          profileImage: resolveImageUrl(profile.profile_image || prev.profileImage),
          websiteLink: profile.templeWebsite || profile.website_link || prev.websiteLink,
          panNumber: profile.pan_number || prev.panNumber,
          tanNumber: profile.tan_number || prev.tanNumber,
          gstNumber: profile.gst_number || prev.gstNumber,
          trustType: profile.trust_type || prev.trustType,
          isTrust: profile.is_trust !== undefined ? Boolean(profile.is_trust) : prev.isTrust,
          reg12A: profile.reg_12a || prev.reg12A,
          reg80G: profile.reg_80g || prev.reg80G,
        }));
        if (profile.profile_image) {
          setImagePreview(resolveImageUrl(profile.profile_image));
        }
      } catch {
        // keep existing fallback values
      }
    };

    loadLatestProfile();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0] as File | undefined;
      if (file) {
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    let result: any = null;

    try {
      // If there's an image to upload, use FormData
      if (selectedImage) {
        const formDataToSend = new FormData();
        formDataToSend.append('profileImage', selectedImage);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('fullName', `${formData.firstName} ${formData.lastName}`.trim() || formData.fullName);
        formDataToSend.append('websiteLink', formData.websiteLink);
        
        // Temple data
        formDataToSend.append('templeData', JSON.stringify({
          name: formData.templeName,
          website_link: formData.websiteLink,
          pan_number: formData.panNumber,
          tan_number: formData.tanNumber,
          gst_number: formData.gstNumber,
          trust_type: formData.trustType,
          is_trust: formData.isTrust,
          reg_12a: formData.reg12A,
          reg_80g: formData.reg80G,
        }));

        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/users/profile`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formDataToSend,
        });

        result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update profile');
        }
      } else {
        const updateData: ProfileUpdateData = {
          email: formData.email,
          fullName: `${formData.firstName} ${formData.lastName}`.trim() || formData.fullName,
          websiteLink: formData.websiteLink,
          templeData: {
            name: formData.templeName,
            website_link: formData.websiteLink,
            pan_number: formData.panNumber,
            tan_number: formData.tanNumber,
            gst_number: formData.gstNumber,
            trust_type: formData.trustType,
            is_trust: formData.isTrust,
            reg_12a: formData.reg12A,
            reg_80g: formData.reg80G,
          },
        };

        result = await updateProfile(updateData);
      }

      if (result && result.success !== false) {
        setSuccess(t[lang].success);
        setShowSuccessModal(true);
        // Refresh user data if returned from API
        if (result.user) {
          // User data updated successfully - could refresh auth context here if needed
          console.log('Profile updated:', result.user);
        }
      }
    } catch (err: any) {
      const message = err.message || t[lang].error;
      setError(message);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-6">
            {t[lang].profile}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image */}
            <div className="flex justify-center mb-6">
              <div className="text-center">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Profile Image
                </label>
                <div className="relative group">
                  <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-100 via-white to-amber-100 border-3 border-orange-200 shadow-xl overflow-hidden group-hover:shadow-2xl transition-all duration-300">
                    {imagePreview || formData.profileImage ? (
                      <img
                        src={imagePreview || formData.profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-12 h-12 text-orange-400" />
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full p-3 cursor-pointer hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-xl hover:shadow-2xl">
                    <Camera className="w-4 h-4" />
                    <input
                      type="file"
                      name="profileImage"
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{t[lang].personalInfo}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    readOnly
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {t[lang].email}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {t[lang].fullName}
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Temple Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">{t[lang].templeInfo}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Temple Name
                  </label>
                  <input
                    type="text"
                    name="templeName"
                    value={formData.templeName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {t[lang].website}
                  </label>
                  <input
                    type="url"
                    name="websiteLink"
                    value={formData.websiteLink}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {t[lang].panNumber}
                  </label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {t[lang].tanNumber}
                  </label>
                  <input
                    type="text"
                    name="tanNumber"
                    value={formData.tanNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {t[lang].gstNumber}
                  </label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {t[lang].trustType}
                  </label>
                  <select
                    name="trustType"
                    value={formData.trustType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  >
                    <option value="">{t[lang].trustType}</option>
                    <option value="Public Charitable Trust">{t[lang].trustTypePublic}</option>
                    <option value="Religious Trust">{t[lang].trustTypeReligious}</option>
                    <option value="Private Trust">{t[lang].trustTypePrivate}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {t[lang].reg12A}
                  </label>
                  <input
                    type="text"
                    name="reg12A"
                    value={formData.reg12A}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    {t[lang].reg80G}
                  </label>
                  <input
                    type="text"
                    name="reg80G"
                    value={formData.reg80G}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-4">
                <input
                  id="isTrust"
                  name="isTrust"
                  type="checkbox"
                  checked={formData.isTrust}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="isTrust" className="text-sm text-black">
                  {t[lang].isTrust}
                </label>
              </div>
            </div>
<div className="flex align-end">

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white py-3 px-6 rounded-xl text-sm font-semibold hover:from-orange-700 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isLoading ? t[lang].saving : t[lang].save}
            </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-green-600">✓ {t[lang].success}</DialogTitle>
          </DialogHeader>
          <DialogFooter className="sm:justify-center pt-2">
            <Button type="button" onClick={() => setShowSuccessModal(false)} className="w-full">
              {t[lang].close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-red-600">⚠ {t[lang].error}</DialogTitle>
            <DialogDescription className="text-center py-4 text-black">
              {error}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center pt-2">
            <Button type="button" variant="outline" onClick={() => setShowErrorModal(false)} className="w-full">
              {t[lang].close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
