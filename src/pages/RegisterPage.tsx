import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] as File | undefined;
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    if (formData.mobileNumber.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    const success = await register({
      name: formData.name,
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

    if (success) {
      setFormData({
        name: '',
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
            <h1 className="text-3xl font-bold text-black">Create Your Account</h1>
            <p className="text-black mt-2">Join our temple community</p>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-4 mb-4 rounded-lg">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  placeholder="Enter 10-digit mobile number"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="gmail"
                  value={formData.gmail}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Website Link
                </label>
                <input
                  type="url"
                  name="weblink"
                  value={formData.weblink}
                  onChange={handleInputChange}
                  placeholder="Enter your website URL"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter a strong password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Profile Image
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
                        <span className="text-gray-400 text-sm">Preview</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="flex flex-col items-center px-4 py-3 bg-white rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-50">
                      <span className="text-sm font-medium text-gray-700">
                        {formData.image ? 'Change Image' : 'Upload Image'}
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
                      JPG, PNG up to 2MB
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
                I am registering as a Trust/Organization
              </label>
            </div>

            {formData.isTrust && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Trust Type</label>
                  <select
                    name="trustType"
                    value={formData.trustType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                  >
                    <option value="" disabled>
                      Select trust type
                    </option>
                    <option value="Public Charitable Trust">Public Charitable Trust</option>
                    <option value="Religious Trust">Religious Trust</option>
                    <option value="Private Trust">Private Trust</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Registration Number</label>
                  <input
                    type="text"
                    name="trustRegistrationNumber"
                    value={formData.trustRegistrationNumber}
                    onChange={handleInputChange}
                    placeholder="Enter registration number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">Date of Registration</label>
                  <input
                    type="date"
                    name="dateOfRegistration"
                    value={formData.dateOfRegistration}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">PAN Number</label>
                  <input
                    type="text"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleInputChange}
                    placeholder="Enter PAN number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">TAN Number</label>
                  <input
                    type="text"
                    name="tanNumber"
                    value={formData.tanNumber}
                    onChange={handleInputChange}
                    placeholder="Enter TAN number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">GST Number</label>
                  <input
                    type="text"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleInputChange}
                    placeholder="Enter GST number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">12A Registration</label>
                  <input
                    type="text"
                    name="reg12A"
                    value={formData.reg12A}
                    onChange={handleInputChange}
                    placeholder="Enter 12A registration"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-2">80G Registration</label>
                  <input
                    type="text"
                    name="reg80G"
                    value={formData.reg80G}
                    onChange={handleInputChange}
                    placeholder="Enter 80G registration"
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
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-black">
                Already have an account?{' '}
                <Link to="/login" className="text-orange-600 hover:text-orange-700 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
