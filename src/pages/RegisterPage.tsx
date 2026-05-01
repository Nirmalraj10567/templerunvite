import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useLanguage } from '../lib/language';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    templeName: '',
    username: '',
    mobileNumber: '',
    gmail: '',
    weblink: '',
    password: '',
    image: null,
    isTrust: false,
    trustType: '',
    trustRegistrationNumber: '',
    dateOfRegistration: '',
    panNumber: '',
    tanNumber: '',
    gstNumber: '',
    reg12A: '',
    reg80G: ''
  });

  const [imagePreview, setImagePreview] = useState('');
  const { register, isLoading, error } = useAuth();
  const { language } = useLanguage();
  const lang = (String(language).toLowerCase() === 'english' ? 'tamil' : 'english') as 'tamil' | 'english';
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  const t = {
    tamil: {
      createAccountTitle: 'உங்கள் கணக்கை உருவாக்குங்கள்',
      joinCommunity: 'எங்கள் கோவில் சமூகத்தில் இணைக',
      username: 'பயனர்பெயர்',
      usernamePlaceholder: 'உங்கள் பயனர்பெயரை உள்ளிடவும்',
      firstName: 'முதல் பெயர்',
      firstNamePlaceholder: 'உங்கள் முதல் பெயரை உள்ளிடவும்',
      lastName: 'கடைசி பெயர்',
      lastNamePlaceholder: 'உங்கள் கடைசி பெயரை உள்ளிடவும்',
      templeName: 'கோவில் பெயர்',
      templeNamePlaceholder: 'உங்கள் கோவில் பெயரை உள்ளிடவும்',
      fullName: 'முழுபெயர்',
      fullNamePlaceholder: 'உங்கள் முழுப்பெயரை உள்ளிடவும்',
      mobileNumber: 'மொபைல் எண்',
      mobilePlaceholder: '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
      emailAddress: 'மின்னஞ்சல் முகவரி',
      emailPlaceholder: 'உங்கள் மின்னஞ்சலை உள்ளிடவும்',
      websiteLink: 'இணையதள இணைப்பு',
      websitePlaceholder: 'உங்கள் இணையதள URL ஐ உள்ளிடவும்',
      password: 'கடவுச்சொல்',
      passwordPlaceholder: 'வலுவான கடவுச்சொல்லை உள்ளிடவும்',
      templeImage: 'கோவில் படம்',
      preview: 'முன்னோட்டம்',
      uploadImage: 'படத்தை பதிவேற்றவும்',
      changeImage: 'படத்தை மாற்றவும்',
      uploadNote: 'JPG, PNG 2MB வரை',
      isTrust: 'நான் ஒரு அறக்கட்டளை/நிறுவனமாக பதிவு செய்கிறேன்',
      trustType: 'அறக்கட்டளை வகை',
      selectTrustType: 'அறக்கட்டளை வகையைத் தேர்ந்தெடுக்கவும்',
      trustTypePublic: 'பொது அறக்கட்டளை',
      trustTypeReligious: 'மத அறக்கட்டளை',
      trustTypePrivate: 'தனியார் அறக்கட்டளை',
      registrationNumber: 'பதிவு எண்',
      registrationNumberPlaceholder: 'பதிவு எண்ணை உள்ளிடவும்',
      dateOfRegistration: 'பதிவு தேதி',
      panNumber: 'PAN எண்',
      panPlaceholder: 'PAN எண்ணை உள்ளிடவும்',
      tanNumber: 'TAN எண்',
      tanPlaceholder: 'TAN எண்ணை உள்ளிடவும்',
      gstNumber: 'GST எண்',
      gstPlaceholder: 'GST எண்ணை உள்ளிடவும்',
      reg12A: '12A பதிவு',
      reg12APlaceholder: '12A பதிவை உள்ளிடவும்',
      reg80G: '80G பதிவு',
      reg80GPlaceholder: '80G பதிவை உள்ளிடவும்',
      creatingAccount: 'கணக்கை உருவாக்குகிறது...',
      createAccount: 'கணக்கை உருவாக்கவும்',
      alreadyHave: 'ஏற்கனவே கணக்கு உள்ளதா?',
      signInHere: 'இங்கே உள்நுழைக',
      alertPasswordMin: 'கடவுச்சொல் குறைந்தது 8 எழுத்துகள் இருக்க வேண்டும்',
      alertMobileValid: 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
      mobileAlreadyRegistered: 'இந்த மொபைல் எண் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது',
      usernameAlreadyRegistered: 'இந்த பயனர் பெயர் ஏற்கனவே பயன்பாட்டில் உள்ளது',
      successRegistered: 'வெற்றிகரமாக பதிவு செய்யப்பட்டது',
      accountReady: 'உங்கள் கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது!',
      continueRegistration: 'மேலும் பதிவு செய்க',
      goToLogin: 'உள்நுள்ளவும்',
      registrationFailed: 'பதிவு தோல்வியடைந்தது',
      close: 'மூடு',
    },
    english: {
      createAccountTitle: 'Create Your Account',
      joinCommunity: 'Join our temple community',
      username: 'Username',
      usernamePlaceholder: 'Enter your username',
      firstName: 'First Name',
      firstNamePlaceholder: 'Enter your first name',
      lastName: 'Last Name',
      lastNamePlaceholder: 'Enter your last name',
      templeName: 'Temple Name',
      templeNamePlaceholder: 'Enter your temple name',
      fullName: 'Full Name',
      fullNamePlaceholder: 'Enter your full name',
      mobileNumber: 'Mobile Number',
      mobilePlaceholder: 'Enter 10-digit mobile number',
      emailAddress: 'Email Address',
      emailPlaceholder: 'Enter your email',
      websiteLink: 'Website Link',
      websitePlaceholder: 'Enter your website URL',
      password: 'Password',
      passwordPlaceholder: 'Enter a strong password',
      templeImage: 'Temple Image',
      preview: 'Preview',
      uploadImage: 'Upload Image',
      changeImage: 'Change Image',
      uploadNote: 'JPG, PNG up to 2MB',
      isTrust: 'I am registering as a Trust/Organization',
      trustType: 'Trust Type',
      selectTrustType: 'Select trust type',
      trustTypePublic: 'Public Charitable Trust',
      trustTypeReligious: 'Religious Trust',
      trustTypePrivate: 'Private Trust',
      registrationNumber: 'Registration Number',
      registrationNumberPlaceholder: 'Enter registration number',
      dateOfRegistration: 'Date of Registration',
      panNumber: 'PAN Number',
      panPlaceholder: 'Enter PAN number',
      tanNumber: 'TAN Number',
      tanPlaceholder: 'Enter TAN number',
      gstNumber: 'GST Number',
      gstPlaceholder: 'Enter GST number',
      reg12A: '12A Registration',
      reg12APlaceholder: 'Enter 12A registration',
      reg80G: '80G Registration',
      reg80GPlaceholder: 'Enter 80G registration',
      creatingAccount: 'Creating Account...',
      createAccount: 'Create Account',
      alreadyHave: 'Already have an account?',
      signInHere: 'Sign in here',
      alertPasswordMin: 'Password must be at least 8 characters',
      alertMobileValid: 'Please enter a valid 10-digit mobile number',
      mobileAlreadyRegistered: 'This mobile number is already registered',
      usernameAlreadyRegistered: 'This username is already taken',
      successRegistered: 'Account Created!',
      accountReady: 'Your account has been successfully created!',
      continueRegistration: 'Register Another',
      goToLogin: 'Go to Login',
      registrationFailed: 'Registration Failed',
      close: 'Close',
    },
  } as const;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      // Capitalize first letter for firstName, lastName, and templeName
      if (name === 'firstName' || name === 'lastName' || name === 'templeName') {
        const capitalizedValue = value.charAt(0).toUpperCase() + value.slice(1);
        setFormData(prev => ({ ...prev, [name]: capitalizedValue }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0] as File | undefined;
      if (file) {
        setFormData(prev => ({ ...prev, image: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
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
    
    if (formData.password.length < 8) {
      setErrorMessage(t[lang].alertPasswordMin as string);
      setShowErrorModal(true);
      return;
    }

    if (formData.mobileNumber.length !== 10) {
      setErrorMessage(t[lang].alertMobileValid as string);
      setShowErrorModal(true);
      return;
    }

    try {
      const result = await register({
        name: `${formData.firstName} ${formData.lastName}`,
        templeName: formData.templeName,
        username: formData.username,
        mobileNumber: formData.mobileNumber,
        gmail: formData.gmail,
        weblink: formData.weblink,
        password: formData.password,
        image: formData.image,
        isTrust: formData.isTrust,
        trustType: formData.trustType,
        trustRegistrationNumber: formData.trustRegistrationNumber,
        dateOfRegistration: formData.dateOfRegistration,
        panNumber: formData.panNumber,
        tanNumber: formData.tanNumber,
        gstNumber: formData.gstNumber,
        reg12A: formData.reg12A,
        reg80G: formData.reg80G
      });

      if (!result?.success) {
        setErrorMessage(result?.error || (t[lang].registrationFailed as string));
        setShowErrorModal(true);
        return;
      }

      setFormData({
        firstName: '',
        lastName: '',
        templeName: '',
        username: '',
        mobileNumber: '',
        gmail: '',
        weblink: '',
        password: '',
        image: null,
        isTrust: false,
        trustType: '',
        trustRegistrationNumber: '',
        dateOfRegistration: '',
        panNumber: '',
        tanNumber: '',
        gstNumber: '',
        reg12A: '',
        reg80G: ''
      });
      setImagePreview('');
      setShowSuccessModal(true);
    } catch (err: any) {
      const message = (err && err.message) ? err.message : (t[lang].registrationFailed as string);
      setErrorMessage(message);
      setShowErrorModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-2xl p-4">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {t[lang].createAccountTitle}
            </h1>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 mb-4 rounded-lg">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Temple Image Upload - First Field */}
            <div className="flex justify-center mb-6">
              <div className="text-center">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t[lang].templeImage}
                </label>
                <div className="relative group">
                  {/* Animated ring effect */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-amber-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300 scale-110 group-hover:scale-105"></div>
                  
                  {/* Main circular container */}
                  <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-orange-100 via-white to-amber-100 border-3 border-orange-200 shadow-xl overflow-hidden group-hover:shadow-2xl transition-all duration-300 group-hover:border-orange-400">
                    {/* Inner glow effect */}
                    <div className="absolute inset-1 rounded-full bg-gradient-to-br from-transparent via-orange-50 to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
                    
                    <div className="relative w-full h-full flex items-center justify-center">
                      {imagePreview ? (
                        <div className="relative w-full h-full">
                          <img
                            src={imagePreview as string}
                            alt="Temple preview"
                            className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                          />
                          {/* Overlay gradient */}
                          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-orange-900/10 to-transparent pointer-events-none"></div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="relative">
                            <svg className="w-12 h-12 text-orange-400 mx-auto mb-2 group-hover:text-orange-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span className="text-sm text-orange-600 font-semibold group-hover:text-orange-700 transition-colors duration-200">{t[lang].uploadImage}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Enhanced camera button */}
                  <label className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full p-3 cursor-pointer hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-110 group-hover:rotate-6">
                    <svg className="w-4 h-4 transition-transform duration-200 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="file"
                      name="image"
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="mt-3 text-xs text-gray-500 font-medium">
                  {t[lang].uploadNote}
                </p>
              </div>
            </div>

            {/* Basic Information - 4 Fields in a Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t[lang].firstName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder={t[lang].firstNamePlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t[lang].lastName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder={t[lang].lastNamePlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t[lang].templeName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="templeName"
                  value={formData.templeName}
                  onChange={handleInputChange}
                  placeholder={t[lang].templeNamePlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t[lang].mobileNumber} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder={t[lang].mobilePlaceholder}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t[lang].emailAddress}
                </label>
                <input
                  type="email"
                  name="gmail"
                  value={formData.gmail}
                  onChange={handleInputChange}
                  placeholder={t[lang].emailPlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t[lang].websiteLink}
                </label>
                <input
                  type="url"
                  name="weblink"
                  value={formData.weblink}
                  onChange={handleInputChange}
                  placeholder={t[lang].websitePlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t[lang].username}
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder={t[lang].usernamePlaceholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  {t[lang].password} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={t[lang].passwordPlaceholder}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-500 focus:outline-none z-20"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>
            </div>

            <hr className="my-2" />

            <div className="flex items-center space-x-2">
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

            {formData.isTrust && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t[lang].trustType}</label>
                  <select
                    name="trustType"
                    value={formData.trustType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  >
                    <option value="" disabled>
                      {t[lang].selectTrustType}
                    </option>
                    <option value="Public Charitable Trust">{t[lang].trustTypePublic}</option>
                    <option value="Religious Trust">{t[lang].trustTypeReligious}</option>
                    <option value="Private Trust">{t[lang].trustTypePrivate}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t[lang].registrationNumber}</label>
                  <input
                    type="text"
                    name="trustRegistrationNumber"
                    value={formData.trustRegistrationNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].registrationNumberPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t[lang].dateOfRegistration}</label>
                  <input
                    type="date"
                    name="dateOfRegistration"
                    value={formData.dateOfRegistration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t[lang].panNumber}</label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].panPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t[lang].tanNumber}</label>
                  <input
                    type="text"
                    name="tanNumber"
                    value={formData.tanNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].tanPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t[lang].gstNumber}</label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].gstPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t[lang].reg12A}</label>
                  <input
                    type="text"
                    name="reg12A"
                    value={formData.reg12A}
                    onChange={handleInputChange}
                    placeholder={t[lang].reg12APlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t[lang].reg80G}</label>
                  <input
                    type="text"
                    name="reg80G"
                    value={formData.reg80G}
                    onChange={handleInputChange}
                    placeholder={t[lang].reg80GPlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-orange-50 transition-all duration-200 shadow-sm hover:shadow-md"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 text-white py-3 px-6 rounded-xl text-sm font-semibold hover:from-orange-700 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? t[lang].creatingAccount : t[lang].createAccount}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-black">
                {t[lang].alreadyHave}{' '}
                <Link to="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                  {t[lang].signInHere}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* Success Registration Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-green-600">🎉 {t[lang].successRegistered}</DialogTitle>
            <DialogDescription className="text-center py-4">
              {t[lang].accountReady}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSuccessModal(false)}
              className="w-full"
            >
              {t[lang].continueRegistration}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/login');
              }}
              className="w-full"
            >
              {t[lang].goToLogin}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-red-600">⚠️ {t[lang].registrationFailed}</DialogTitle>
            <DialogDescription className="text-center py-4 text-black">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowErrorModal(false)}
              className="w-full"
            >
              {t[lang].close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}