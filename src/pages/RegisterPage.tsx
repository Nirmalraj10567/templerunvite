import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../lib/language';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, User, Lock, Building2, Phone, Mail, Globe, Shield, Cloud, Building, LogIn } from 'lucide-react';
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
    websiteLink: '',
    password: '',
    image: null as File | null,
    isTrust: false,
    trustType: '',
    trustRegistrationNumber: '',
    dateOfRegistration: '',
    panNumber: '',
    tanNumber: '',
    gstNumber: '',
    reg12A: '',
    reg80G: '',
  });

  const [imagePreview, setImagePreview] = useState('');
  const { register, isLoading, error } = useAuth();
  const { language, setLanguage } = useLanguage();
  const lang =
    (String(language).toLowerCase() === 'tamil'
      ? 'english'
      : 'tamil') as 'tamil' | 'english';

  const { toast } = useToast();
  const navigate = useNavigate();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successTimer, setSuccessTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const clearSuccessTimer = () => {
    if (successTimer) {
      clearTimeout(successTimer);
      setSuccessTimer(null);
    }
  };

  const t = {
    tamil: {
      createAccountTitle: 'உங்கள் கணக்கை உருவாக்குங்கள்',
      createSubtitle: 'உங்கள் புதிய கணக்கை உருவாக்க கீழே விவரங்களை உள்ளிடவும்',
      username: 'பயனர்பெயர்',
      usernamePlaceholder: 'உங்கள் பயனர்பெயரை உள்ளிடவும்',
      firstName: 'முதல் பெயர்',
      firstNamePlaceholder: 'முதல் பெயர்',
      lastName: 'கடைசி பெயர்',
      lastNamePlaceholder: 'கடைசி பெயர்',
      templeName: 'கோவில் பெயர்',
      templeNamePlaceholder: 'கோவில் பெயரை உள்ளிடவும்',
      mobileNumber: 'மொபைல் எண்',
      mobilePlaceholder: '10 இலக்க மொபைல் எண்',
      emailAddress: 'மின்னஞ்சல்',
      emailPlaceholder: 'மின்னஞ்சலை உள்ளிடவும்',
      websiteLink: 'இணையதளம்',
      websitePlaceholder: 'இணையதள URL',
      password: 'கடவுச்சொல்',
      passwordPlaceholder: 'கடவுச்சொல்லை உள்ளிடவும்',
      templeImage: 'கோவில் படம்',
      uploadImage: 'படத்தை பதிவேற்றவும்',
      uploadNote: 'JPG, PNG 2MB வரை',
      isTrust: 'அறக்கட்டளையாக பதிவு செய்க',
      trustType: 'அறக்கட்டளை வகை',
      selectTrustType: 'வகையைத் தேர்ந்தெடுக்கவும்',
      trustTypePublic: 'பொது அறக்கட்டளை',
      trustTypeReligious: 'மத அறக்கட்டளை',
      trustTypePrivate: 'தனியார் அறக்கட்டளை',
      registrationNumber: 'பதிவு எண்',
      registrationNumberPlaceholder: 'பதிவு எண்',
      dateOfRegistration: 'பதிவு தேதி',
      panNumber: 'PAN எண்',
      panPlaceholder: 'PAN எண்',
      tanNumber: 'TAN எண்',
      tanPlaceholder: 'TAN எண்',
      gstNumber: 'GST எண்',
      gstPlaceholder: 'GST எண்',
      reg12A: '12A பதிவு',
      reg12APlaceholder: '12A',
      reg80G: '80G பதிவு',
      reg80GPlaceholder: '80G',
      creatingAccount: 'கணக்கை உருவாக்குகிறது...',
      createAccount: 'கணக்கை உருவாக்கவும்',
      clearForm: 'படிவத்தை அழிக்கவும்',
      alreadyHave: 'ஏற்கனவே கணக்கு உள்ளதா?',
      signInHere: 'இங்கே உள்நுழைக',
      alertPasswordMin: 'கடவுச்சொல் குறைந்தது 8 எழுத்துகள் இருக்க வேண்டும்',
      alertMobileValid: 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
      successRegistered: 'வெற்றிகரமாக பதிவு செய்யப்பட்டது',
      accountReady: 'உங்கள் கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது!',
      continueRegistration: 'மேலும் பதிவு செய்க',
      goToLogin: 'உள்நுழைக',
      registrationFailed: 'பதிவு தோல்வியடைந்தது',
      close: 'மூடு',
      clearConfirm: 'படிவத்தை அழிக்க விரும்புகிறீர்களா?',
      leftSubtitle: 'உங்கள் வணிக நடவடிக்கைகளை எளிதாக்குங்கள்',
      leftBadge: 'நிறுவன வள திட்டமிடல்',
      featureMultiCompany: 'பல நிறுவன ஆதரவு',
      featureSecure: 'பாதுகாப்பான அங்கீகாரம்',
      featureCloud: 'கிளவுட் அடிப்படை',
    },

    english: {
      createAccountTitle: 'Create Your Account',
      createSubtitle: 'Enter your details below to create your new account',
      username: 'Username',
      usernamePlaceholder: 'Enter your username',
      firstName: 'First Name',
      firstNamePlaceholder: 'First name',
      lastName: 'Last Name',
      lastNamePlaceholder: 'Last name',
      templeName: 'Temple Name',
      templeNamePlaceholder: 'Enter temple name',
      mobileNumber: 'Mobile Number',
      mobilePlaceholder: '10-digit mobile number',
      emailAddress: 'Email',
      emailPlaceholder: 'Enter your email',
      websiteLink: 'Website',
      websitePlaceholder: 'Website URL',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      templeImage: 'Temple Image',
      uploadImage: 'Upload Image',
      uploadNote: 'JPG, PNG up to 2MB',
      isTrust: 'Register as Trust',
      trustType: 'Trust Type',
      selectTrustType: 'Select trust type',
      trustTypePublic: 'Public Charitable Trust',
      trustTypeReligious: 'Religious Trust',
      trustTypePrivate: 'Private Trust',
      registrationNumber: 'Registration Number',
      registrationNumberPlaceholder: 'Registration number',
      dateOfRegistration: 'Date of Registration',
      panNumber: 'PAN Number',
      panPlaceholder: 'PAN number',
      tanNumber: 'TAN Number',
      tanPlaceholder: 'TAN number',
      gstNumber: 'GST Number',
      gstPlaceholder: 'GST number',
      reg12A: '12A Registration',
      reg12APlaceholder: '12A',
      reg80G: '80G Registration',
      reg80GPlaceholder: '80G',
      creatingAccount: 'Creating Account...',
      createAccount: 'Create Account',
      clearForm: 'Clear Form',
      alreadyHave: 'Already have an account?',
      signInHere: 'Sign in here',
      alertPasswordMin: 'Password must be at least 8 characters',
      alertMobileValid: 'Please enter a valid 10-digit mobile number',
      successRegistered: 'Account Created!',
      accountReady: 'Your account has been successfully created!',
      continueRegistration: 'Register Another',
      goToLogin: 'Go to Login',
      registrationFailed: 'Registration Failed',
      close: 'Close',
      clearConfirm: 'Are you sure you want to clear the form?',
      leftSubtitle: 'Manage with focus. Let us handle the administration while you grow your business.',
      leftBadge: 'ENTERPRISE RESOURCE PLANNING',
      featureMultiCompany: 'Multi-Company Support',
      featureSecure: 'Secure Authentication',
      featureCloud: 'Cloud Based',
    },
  } as const;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
        ...(name === 'isTrust' && checked ? { trustType: 'Religious' } : {}),
      }));
      return;
    }

    if (
      name === 'firstName' ||
      name === 'lastName' ||
      name === 'templeName'
    ) {
      const capitalized =
        value.charAt(0).toUpperCase() + value.slice(1);

      setFormData((prev) => ({
        ...prev,
        [name]: capitalized,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setFormData((prev) => ({
      ...prev,
      image: file,
    }));

    const reader = new FileReader();

    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleClearForm = () => {
    if (window.confirm(t[lang].clearConfirm)) {
      setFormData({
        firstName: '',
        lastName: '',
        templeName: '',
        username: '',
        mobileNumber: '',
        gmail: '',
        websiteLink: '',
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
        reg80G: '',
      });
      setImagePreview('');
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      setErrorMessage(t[lang].alertPasswordMin);
      setShowErrorModal(true);
      return;
    }

    if (formData.mobileNumber.length !== 10) {
      setErrorMessage(t[lang].alertMobileValid);
      setShowErrorModal(true);
      return;
    }

    try {
      const result = await register({
        name: `${formData.firstName} ${formData.lastName}`,
        username: formData.username,
        templeName: formData.templeName,
        mobileNumber: formData.mobileNumber,
        gmail: formData.gmail,
        websiteLink: formData.websiteLink,
        password: formData.password,
        image: formData.image,
        isTrust: formData.isTrust,
        trustType: formData.trustType,
        trustRegistrationNumber:
          formData.trustRegistrationNumber,
        dateOfRegistration: formData.dateOfRegistration,
        panNumber: formData.panNumber,
        tanNumber: formData.tanNumber,
        gstNumber: formData.gstNumber,
        reg12A: formData.reg12A,
        reg80G: formData.reg80G,
      });

      if (!result?.success) {
        setErrorMessage(
          result?.error || t[lang].registrationFailed
        );
        setShowErrorModal(true);
        return;
      }

      navigate('/login', {
        state: { message: t[lang].accountReady || 'Your account has been successfully created!' },
        replace: true
      });
    } catch (err: any) {
      setErrorMessage(
        err?.message || t[lang].registrationFailed
      );
      setShowErrorModal(true);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative overflow-hidden bg-gradient-to-br from-[#f4845f] via-[#e85d04] to-[#dc2f02]">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M40 0c22.09 0 40 17.91 40 40s-17.91 40-40 40S0 62.09 0 40 17.91 0 40 0zm0 6a34 34 0 110 68 34 34 0 010-68zm0 6a28 28 0 100 56 28 28 0 000-56zm0 6a22 22 0 110 44 22 22 0 010-44zm0 6a16 16 0 100 32 16 16 0 000-32z'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }} />
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 xl:px-20 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-xl">
            <Building className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-3xl xl:text-4xl font-bold text-white mb-5 tracking-tight">
          TMS
          </h1>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-px bg-white/40" />
            <div className="w-1.5 h-1.5 rotate-45 bg-white/60" />
            <div className="w-10 h-px bg-white/40" />
          </div>

          <p className="text-base text-white/80 leading-relaxed max-w-sm mb-8">
            {t[lang].leftSubtitle}
          </p>

          <div className="space-y-3 mb-8">
            {[
              { icon: Building2, text: t[lang].featureMultiCompany },
              { icon: Shield, text: t[lang].featureSecure },
              { icon: Cloud, text: t[lang].featureCloud },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <feature.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{feature.text}</span>
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
            {t[lang].leftBadge}
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col px-6 py-6 lg:px-12 bg-gradient-to-b from-[#fef7f0] via-white to-[#fef7f0]">
        {/* Language Toggle */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setLanguage(language === 'english' ? 'tamil' : 'english')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-all shadow-sm"
          >
            <Globe className="w-4 h-4 text-[#e85d04]" />
            {language === 'english' ? 'தமிழ்' : 'English'}
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-[520px] py-4">
            {/* Header */}
            <div className="mb-5">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {t[lang].createAccountTitle}
              </h1>
              <p className="text-gray-500 text-sm">
                {t[lang].createSubtitle}
              </p>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08)] border border-gray-100 p-5">
              {error && (
                <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg mb-4">
                  <p className="text-xs font-medium text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Image Upload */}
                <div className="flex justify-center mb-3">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-[#e85d04]/30 overflow-hidden bg-[#e85d04]/5 flex items-center justify-center">
                      {imagePreview ? (
                        <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-[#e85d04]/40" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 bg-[#e85d04] hover:bg-[#dc2f02] text-white rounded-full p-1.5 cursor-pointer shadow-md transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>
                </div>

                {/* Name Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t[lang].firstName} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder={t[lang].firstNamePlaceholder}
                      required
                      className="w-full h-9 px-3 rounded-lg border-gray-200 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t[lang].lastName} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder={t[lang].lastNamePlaceholder}
                      required
                      className="w-full h-9 px-3 rounded-lg border-gray-200 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Temple Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t[lang].templeName} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      name="templeName"
                      value={formData.templeName}
                      onChange={handleInputChange}
                      placeholder={t[lang].templeNamePlaceholder}
                      required
                      className="w-full h-9 pl-9 pr-3 rounded-lg border-gray-200 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Mobile + Email */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t[lang].mobileNumber} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                      <Input
                        type="tel"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleInputChange}
                        placeholder={t[lang].mobilePlaceholder}
                        maxLength={10}
                        required
                        className="w-full h-9 pl-9 pr-3 rounded-lg border-gray-200 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t[lang].emailAddress}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                      <Input
                        type="email"
                        name="gmail"
                        value={formData.gmail}
                        onChange={handleInputChange}
                        placeholder={t[lang].emailPlaceholder}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border-gray-200 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Username + Password */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t[lang].username}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        placeholder={t[lang].usernamePlaceholder}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border-gray-200 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t[lang].password} <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder={t[lang].passwordPlaceholder}
                        required
                        className="w-full h-9 pl-9 pr-9 rounded-lg border-gray-200 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400 hover:text-[#e85d04]" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400 hover:text-[#e85d04]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t[lang].websiteLink}
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      name="websiteLink"
                      value={formData.websiteLink}
                      onChange={handleInputChange}
                      placeholder={t[lang].websitePlaceholder}
                      className="w-full h-9 pl-9 pr-3 rounded-lg border-gray-200 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#e85d04]/20 focus:border-[#e85d04] bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Trust Checkbox */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="isTrust"
                    name="isTrust"
                    checked={formData.isTrust}
                    onChange={handleInputChange}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#e85d04] focus:ring-[#e85d04]"
                  />
                  <span className="text-xs font-medium text-gray-700">{t[lang].isTrust}</span>
                </label>

                {/* Trust Fields */}
                {formData.isTrust && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t[lang].registrationNumber}</label>
                      <Input type="text" name="trustRegistrationNumber" value={formData.trustRegistrationNumber} onChange={handleInputChange} placeholder={t[lang].registrationNumberPlaceholder} className="w-full h-9 px-3 rounded-lg border-gray-200 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t[lang].dateOfRegistration}</label>
                      <Input type="date" name="dateOfRegistration" value={formData.dateOfRegistration} onChange={handleInputChange} className="w-full h-9 px-3 rounded-lg border-gray-200 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t[lang].panNumber}</label>
                      <Input type="text" name="panNumber" value={formData.panNumber} onChange={handleInputChange} placeholder={t[lang].panPlaceholder} className="w-full h-9 px-3 rounded-lg border-gray-200 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t[lang].tanNumber}</label>
                      <Input type="text" name="tanNumber" value={formData.tanNumber} onChange={handleInputChange} placeholder={t[lang].tanPlaceholder} className="w-full h-9 px-3 rounded-lg border-gray-200 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t[lang].gstNumber}</label>
                      <Input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} placeholder={t[lang].gstPlaceholder} className="w-full h-9 px-3 rounded-lg border-gray-200 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t[lang].reg12A}</label>
                      <Input type="text" name="reg12A" value={formData.reg12A} onChange={handleInputChange} placeholder={t[lang].reg12APlaceholder} className="w-full h-9 px-3 rounded-lg border-gray-200 text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">{t[lang].reg80G}</label>
                      <Input type="text" name="reg80G" value={formData.reg80G} onChange={handleInputChange} placeholder={t[lang].reg80GPlaceholder} className="w-full h-9 px-3 rounded-lg border-gray-200 text-sm bg-white" />
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="p-2.5 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#f4845f] to-[#e85d04] hover:from-[#e85d04] hover:to-[#dc2f02] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t[lang].creatingAccount}
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      {t[lang].createAccount}
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Footer */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                {t[lang].alreadyHave}{' '}
                <Link to="/login" className="font-semibold text-[#e85d04] hover:text-[#dc2f02] transition-colors">
                  {t[lang].signInHere}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 text-2xl">
              {t[lang].successRegistered}
            </DialogTitle>
            <DialogDescription className="text-center pt-4">
              {t[lang].accountReady}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => { clearSuccessTimer(); setShowSuccessModal(false); }}>
              {t[lang].continueRegistration}
            </Button>
            <Button onClick={() => { clearSuccessTimer(); setShowSuccessModal(false); navigate('/login'); }}>
              {t[lang].goToLogin}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ERROR MODAL */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-red-600 text-2xl">
              {t[lang].registrationFailed}
            </DialogTitle>
            <DialogDescription className="text-center pt-4 text-black">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setShowErrorModal(false)}>
              {t[lang].close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
