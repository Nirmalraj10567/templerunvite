import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useLanguage } from '../lib/language';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, User, Lock } from 'lucide-react';
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
  const { language } = useLanguage();
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

  const t = {
    tamil: {
      createAccountTitle: 'உங்கள் கணக்கை உருவாக்குங்கள்',
      username: 'பயனர்பெயர்',
      usernamePlaceholder: 'உங்கள் பயனர்பெயரை உள்ளிடவும்',
      firstName: 'முதல் பெயர்',
      firstNamePlaceholder: 'உங்கள் முதல் பெயரை உள்ளிடவும்',
      lastName: 'கடைசி பெயர்',
      lastNamePlaceholder: 'உங்கள் கடைசி பெயரை உள்ளிடவும்',
      templeName: 'கோவில் பெயர்',
      templeNamePlaceholder: 'உங்கள் கோவில் பெயரை உள்ளிடவும்',
      mobileNumber: 'மொபைல் எண்',
      mobilePlaceholder: '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
      emailAddress: 'மின்னஞ்சல் முகவரி',
      emailPlaceholder: 'உங்கள் மின்னஞ்சலை உள்ளிடவும்',
      websiteLink: 'இணையதள இணைப்பு',
      websitePlaceholder: 'உங்கள் இணையதள URL ஐ உள்ளிடவும்',
      password: 'கடவுச்சொல்',
      passwordPlaceholder: 'வலுவான கடவுச்சொல்லை உள்ளிடவும்',
      templeImage: 'கோவில் படம்',
      uploadImage: 'படத்தை பதிவேற்றவும்',
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
    },

    english: {
      createAccountTitle: 'Create Your Account',
      username: 'Username',
      usernamePlaceholder: 'Enter your username',
      firstName: 'First Name',
      firstNamePlaceholder: 'Enter your first name',
      lastName: 'Last Name',
      lastNamePlaceholder: 'Enter your last name',
      templeName: 'Temple Name',
      templeNamePlaceholder: 'Enter your temple name',
      mobileNumber: 'Mobile Number',
      mobilePlaceholder: 'Enter 10-digit mobile number',
      emailAddress: 'Email Address',
      emailPlaceholder: 'Enter your email',
      websiteLink: 'Website Link',
      websitePlaceholder: 'Enter your website URL',
      password: 'Password',
      passwordPlaceholder: 'Enter a strong password',
      templeImage: 'Temple Image',
      uploadImage: 'Upload Image',
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

      setShowSuccessModal(true);
    } catch (err: any) {
      setErrorMessage(
        err?.message || t[lang].registrationFailed
      );
      setShowErrorModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8efdf]">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10">
          {/* TITLE */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-orange-600">
              {t[lang].createAccountTitle}
            </h1>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* IMAGE */}
            <div className="flex justify-center">
              <div className="text-center">
                <label className="block text-sm font-semibold mb-4">
                  {t[lang].templeImage}
                </label>

                <div className="relative">
                  <div className="w-40 h-40 rounded-full border-4 border-orange-200 overflow-hidden bg-orange-50 flex items-center justify-center shadow-lg">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <div className="text-5xl text-orange-400">
                          +
                        </div>

                        <p className="text-orange-500 text-sm font-medium mt-2">
                          {t[lang].uploadImage}
                        </p>
                      </div>
                    )}
                  </div>

                  <label className="absolute bottom-2 right-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full p-3 cursor-pointer shadow-lg">
                    📷
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  {t[lang].uploadNote}
                </p>
              </div>
            </div>

            {/* FORM GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* FIRST NAME */}
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  {t[lang].firstName}{' '}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder={t[lang].firstNamePlaceholder}
                  required
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* LAST NAME */}
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  {t[lang].lastName}{' '}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder={t[lang].lastNamePlaceholder}
                  required
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* TEMPLE NAME */}
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  {t[lang].templeName}{' '}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  name="templeName"
                  value={formData.templeName}
                  onChange={handleInputChange}
                  placeholder={t[lang].templeNamePlaceholder}
                  required
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* MOBILE */}
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  {t[lang].mobileNumber}{' '}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder={t[lang].mobilePlaceholder}
                  maxLength={10}
                  required
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  {t[lang].emailAddress}
                </label>

                <input
                  type="email"
                  name="gmail"
                  value={formData.gmail}
                  onChange={handleInputChange}
                  placeholder={t[lang].emailPlaceholder}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* WEBSITE */}
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  {t[lang].websiteLink}
                </label>

                <input
                  type="text"
                  name="websiteLink"
                  value={formData.websiteLink}
                  onChange={handleInputChange}
                  placeholder={t[lang].websitePlaceholder}
                  className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              {/* USERNAME */}
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  {t[lang].username}
                </label>

                <div className="relative">
                  <User className="absolute left-3 top-4 w-4 h-4 text-gray-400" />

                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder={t[lang].usernamePlaceholder}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block mb-2 text-sm font-semibold">
                  {t[lang].password}{' '}
                  <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <Lock className="absolute left-3 top-4 w-4 h-4 text-gray-400" />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={t[lang].passwordPlaceholder}
                    required
                    className="w-full h-12 pl-10 pr-12 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="absolute right-3 top-3 text-gray-500"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* TRUST CHECKBOX */}
            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="isTrust"
                name="isTrust"
                checked={formData.isTrust}
                onChange={handleInputChange}
                className="w-4 h-4"
              />

              <label
                htmlFor="isTrust"
                className="text-sm font-medium"
              >
                {t[lang].isTrust}
              </label>
            </div>

            {/* TRUST FIELDS */}
            {formData.isTrust && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 border-t pt-6">
                <div>
                  <label className="block mb-2 text-sm font-semibold">
                    {t[lang].trustType}
                  </label>

                  <input
                    type="text"
                    value={t[lang].trustTypeReligious}
                    readOnly
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 bg-gray-50 text-gray-500 outline-none cursor-default"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold">
                    {t[lang].registrationNumber}
                  </label>

                  <input
                    type="text"
                    name="trustRegistrationNumber"
                    value={formData.trustRegistrationNumber}
                    onChange={handleInputChange}
                    placeholder={
                      t[lang].registrationNumberPlaceholder
                    }
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold">
                    {t[lang].dateOfRegistration}
                  </label>

                  <input
                    type="date"
                    name="dateOfRegistration"
                    value={formData.dateOfRegistration}
                    onChange={handleInputChange}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold">
                    {t[lang].panNumber}
                  </label>

                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].panPlaceholder}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold">
                    {t[lang].tanNumber}
                  </label>

                  <input
                    type="text"
                    name="tanNumber"
                    value={formData.tanNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].tanPlaceholder}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold">
                    {t[lang].gstNumber}
                  </label>

                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    placeholder={t[lang].gstPlaceholder}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold">
                    {t[lang].reg12A}
                  </label>

                  <input
                    type="text"
                    name="reg12A"
                    value={formData.reg12A}
                    onChange={handleInputChange}
                    placeholder={t[lang].reg12APlaceholder}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold">
                    {t[lang].reg80G}
                  </label>

                  <input
                    type="text"
                    name="reg80G"
                    value={formData.reg80G}
                    onChange={handleInputChange}
                    placeholder={t[lang].reg80GPlaceholder}
                    className="w-full h-12 px-4 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* BUTTONS: Clear on left, Create Account on right */}
          <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClearForm}
                className="px-6 h-12 rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                {t[lang].clearForm}
              </Button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-8 h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base transition-all duration-200 shadow-md"
              >
                {isLoading
                  ? t[lang].creatingAccount
                  : t[lang].createAccount}
              </button>
            </div>

            {/* LOGIN */}
            <div className="text-center">
              <p className="text-gray-700">
                {t[lang].alreadyHave}{' '}
                <Link
                  to="/login"
                  className="text-orange-600 font-semibold hover:underline"
                >
                  {t[lang].signInHere}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>

      {/* SUCCESS MODAL */}
      <Dialog
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-green-600 text-2xl">
              🎉 {t[lang].successRegistered}
            </DialogTitle>

            <DialogDescription className="text-center pt-4">
              {t[lang].accountReady}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() =>
                setShowSuccessModal(false)
              }
            >
              {t[lang].continueRegistration}
            </Button>

            <Button
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/login');
              }}
            >
              {t[lang].goToLogin}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ERROR MODAL */}
      <Dialog
        open={showErrorModal}
        onOpenChange={setShowErrorModal}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-red-600 text-2xl">
              ⚠️ {t[lang].registrationFailed}
            </DialogTitle>

            <DialogDescription className="text-center pt-4 text-black">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                setShowErrorModal(false)
              }
            >
              {t[lang].close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}