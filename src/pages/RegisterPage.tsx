import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useLanguage } from '../lib/language';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
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
    name: '',
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

  const t = {
    tamil: {
      createAccountTitle: 'உங்கள் கணக்கை உருவாக்குங்கள்',
      joinCommunity: 'எங்கள் கோவில் சமூகத்தில் இணைக',
      username: 'பயனர்பெயர்',
      usernamePlaceholder: 'உங்கள் பயனர்பெயரை உள்ளிடவும்',
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
      profileImage: 'சுயவிவர படம்',
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
      profileImage: 'Profile Image',
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
      setFormData(prev => ({ ...prev, [name]: value }));
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
        name: formData.name,
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
        name: '',
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">🕉️</span>
            </div>
            <h1 className="text-3xl font-bold text-black">{t[lang].createAccountTitle}</h1>
            <p className="text-black mt-2">{t[lang].joinCommunity}</p>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-4 mb-4 rounded-lg">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  {t[lang].fullName} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t[lang].fullNamePlaceholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  {t[lang].username}
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder={t[lang].usernamePlaceholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  {t[lang].emailAddress}
                </label>
                <input
                  type="email"
                  name="gmail"
                  value={formData.gmail}
                  onChange={handleInputChange}
                  placeholder={t[lang].emailPlaceholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  {t[lang].websiteLink}
                </label>
                <input
                  type="url"
                  name="weblink"
                  value={formData.weblink}
                  onChange={handleInputChange}
                  placeholder={t[lang].websitePlaceholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  {t[lang].password} <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t[lang].passwordPlaceholder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  {t[lang].profileImage}
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {imagePreview ? (
                        <img
                          src={imagePreview as string}
                          alt="Profile preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">{t[lang].preview}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="flex flex-col items-center px-4 py-3 bg-white rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                      <span className="text-sm font-medium text-gray-700">
                        {formData.image ? t[lang].changeImage : t[lang].uploadImage}
                      </span>
                      <input
                        type="file"
                        name="image"
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      {t[lang].uploadNote}
                    </p>
                  </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t[lang].trustType}</label>
                  <select
                    name="trustType"
                    value={formData.trustType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
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
                  <label className="block text-sm font-medium text-black mb-2">{t[lang].registrationNumber}</label>
                  <input
                    type="text"
                    name="trustRegistrationNumber"
                    value={formData.trustRegistrationNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].registrationNumberPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t[lang].dateOfRegistration}</label>
                  <input
                    type="date"
                    name="dateOfRegistration"
                    value={formData.dateOfRegistration}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t[lang].panNumber}</label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].panPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t[lang].tanNumber}</label>
                  <input
                    type="text"
                    name="tanNumber"
                    value={formData.tanNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].tanPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t[lang].gstNumber}</label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].gstPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t[lang].reg12A}</label>
                  <input
                    type="text"
                    name="reg12A"
                    value={formData.reg12A}
                    onChange={handleInputChange}
                    placeholder={t[lang].reg12APlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">{t[lang].reg80G}</label>
                  <input
                    type="text"
                    name="reg80G"
                    value={formData.reg80G}
                    onChange={handleInputChange}
                    placeholder={t[lang].reg80GPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors shadow-lg disabled:opacity-50"
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
