import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type Heir = {
  id: number;
  serialNumber: number;
  name: string;
  race: string;
  maritalStatus: 'unmarried' | 'married' | 'divorced' | 'widowed';
  education: string;
  birthDate: string;
};

export default function TempleUserEntryPage() {
  const { user, token } = useAuth();

  // UI feature flags (backend not ready yet for these)
  const enablePhotoUpload = true;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [newUser, setNewUser] = useState({
    receiptNumber: '6672',
    date: today,
    landownerNo: '',
    mobileNumber: '',
    name: '',
    alternativeName: '',
    wifeName: '',
    fatherName: '',
    address: '',
    postalCode: '',
    year: new Date().getFullYear().toString(),
    amount: '',
    amountPaid: '',
    donation: '',
    totalAmount: '',
    education: '',
    occupation: '',
    aadhaarNumber: '',
    clan: '',
    group: '',
    maleHeirs: 0,
    femaleHeirs: 0,
    outstandingAmount: '',
    photo: null as File | null,
    heirs: [] as Heir[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Master data
  const [masterClans, setMasterClans] = useState<string[]>([]);
  const [masterGroups, setMasterGroups] = useState<string[]>([]);
  const [masterOccupations, setMasterOccupations] = useState<string[]>([]);
  const [masterEducations, setMasterEducations] = useState<string[]>([]);
  const [masterRaces, setMasterRaces] = useState<string[]>([]);

  useEffect(() => {
    if (user?.templeId && token) {
      (async () => {
        try {
          const [clansRes, groupsRes, occupationsRes] = await Promise.all([
            fetch(`/api/master-clans/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/master-groups/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/master-occupations/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);

          if (clansRes.ok) setMasterClans((await clansRes.json()).map((x: any) => x.name));
          if (groupsRes.ok) setMasterGroups((await groupsRes.json()).map((x: any) => x.name));
          if (occupationsRes.ok) setMasterOccupations((await occupationsRes.json()).map((x: any) => x.name));

          setMasterEducations([
            'Illiterate',
            'Primary',
            'Secondary',
            'Higher Secondary',
            'Diploma',
            'Bachelor Degree',
            'Master Degree',
            'PhD',
            'Professional Course',
            'Technical Training',
            'Other',
          ]);
          setMasterRaces(['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra', 'Other', 'Not Specified']);
        } catch (e) {
          console.error('Error loading master data', e);
        }
      })();
    }
  }, [user, token]);

  const handleFieldChange = (field: string, value: any) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const formatMobileNumber = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 10);
    if (clean.length >= 6) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    if (clean.length >= 3) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return clean;
  };

  const formatAadhaarNumber = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 12);
    if (clean.length >= 8) return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`;
    if (clean.length >= 4) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    return clean;
  };

  const handleFormattedInput = (
    field: string,
    value: string,
    formatter: (v: string) => string,
  ) => {
    const formatted = formatter(value);
    setNewUser((prev) => ({ ...prev, [field]: formatted }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // Mobile number lookup function
  const lookupUserByMobile = async (mobileNumber: string) => {
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) return;

    setLookingUp(true);
    setSuccessMessage(null);

    try {
      // Search in user_registrations table for existing user data using the search parameter
      const response = await fetch(`/api/registrations?search=${cleanMobile}&pageSize=1`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          const userData = data.data[0]; // Get the first matching record

          // Auto-fill form with existing user data
          setNewUser(prev => ({
            ...prev,
            name: userData.name || '',
            alternativeName: userData.alternative_name || '',
            wifeName: userData.wife_name || '',
            fatherName: userData.father_name || '',
            address: userData.address || '',
            postalCode: userData.postal_code || '',
            education: userData.education || '',
            occupation: userData.occupation || '',
            aadhaarNumber: userData.aadhaar_number ? formatAadhaarNumber(userData.aadhaar_number) : '',
            clan: userData.clan || '',
            group: userData.group || '',
            maleHeirs: userData.male_heirs || 0,
            femaleHeirs: userData.female_heirs || 0,
          }));

          setSuccessMessage(`✅ Found: ${userData.name} - Registration ID ${userData.id} / கண்டுபிடிக்கப்பட்டது: ${userData.name} - பதிவு ID ${userData.id}`);
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          // No existing registration found - show info message
          setSuccessMessage(`ℹ️ No existing registration found for this mobile / இந்த கைபேசி எண்ணுக்கு பதிவு இல்லை`);
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      }
    } catch (error) {
      console.error('Error looking up user:', error);
      // Don't show error for lookup failure, just continue with manual entry
    } finally {
      setLookingUp(false);
    }
  };

  // Handle mobile number change with lookup
  const handleMobileChange = (value: string) => {
    const formatted = formatMobileNumber(value);
    setNewUser(prev => ({ ...prev, mobileNumber: formatted }));
    if (errors.mobileNumber) setErrors(prev => ({ ...prev, mobileNumber: '' }));

    // Trigger lookup when mobile number is complete (10 digits) with debounce
    const cleanMobile = value.replace(/\D/g, '');
    if (cleanMobile.length === 10 && user?.templeId && token) {
      // Add a small delay to avoid rapid API calls
      setTimeout(() => {
        // Check if mobile number is still the same (user hasn't changed it)
        if (newUser.mobileNumber === formatted) {
          lookupUserByMobile(formatted);
        }
      }, 500);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024) {
      alert('File size must be less than 100kb');
      e.currentTarget.value = '';
      return;
    }
    setNewUser((prev) => ({ ...prev, photo: file }));
  };

  const addHeir = () => {
    const heir: Heir = {
      id: Date.now(),
      serialNumber: (newUser.heirs?.length || 0) + 1,
      name: '',
      race: '',
      maritalStatus: 'unmarried',
      education: '',
      birthDate: '',
    };
    setNewUser((prev) => ({ ...prev, heirs: [...prev.heirs, heir] }));
  };

  const removeHeir = (id: number) => {
    setNewUser((prev) => ({ ...prev, heirs: prev.heirs.filter((h) => h.id !== id) }));
  };

  const updateHeir = (id: number, field: keyof Heir, value: any) => {
    setNewUser((prev) => ({
      ...prev,
      heirs: prev.heirs.map((h) => (h.id === id ? { ...h, [field]: value } : h)),
    }));
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!newUser.landownerNo.trim()) e.landownerNo = 'Landowner number is required';
    if (!newUser.name.trim()) e.name = 'Name is required';
    if (!newUser.fatherName.trim()) e.fatherName = "Father's name is required";
    if (!newUser.mobileNumber.trim()) e.mobileNumber = 'Mobile number is required';
    if (!newUser.address.trim()) e.address = 'Address is required';
    if (!newUser.education.trim()) e.education = 'Education is required';
    if (!newUser.occupation.trim()) e.occupation = 'Occupation is required';
    if (!newUser.amount.trim()) e.amount = 'Amount is required';

    // Heirs minimal validation if present
    if (newUser.heirs?.length) {
      newUser.heirs.forEach((h, i) => {
        if (!h.name.trim()) e[`heir_${i}_name`] = 'Heir name is required';
        if (!h.race.trim()) e[`heir_${i}_race`] = 'Heir race/community is required';
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddUser = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // Map to backend /api/registrations JSON fields
      const payload = {
        referenceNumber: newUser.receiptNumber,
        date: newUser.date,
        subdivision: newUser.landownerNo,
        name: newUser.name,
        alternativeName: newUser.alternativeName,
        wifeName: newUser.wifeName,
        education: newUser.education,
        occupation: newUser.occupation,
        fatherName: newUser.fatherName,
        address: newUser.address,
        birthDate: today, // no dedicated picker in this UI block; keep today or add later
        village: '',
        mobileNumber: newUser.mobileNumber.replace(/\D/g, ''),
        aadhaarNumber: newUser.aadhaarNumber.replace(/\D/g, ''),
        panNumber: '',
        clan: newUser.clan,
        group: newUser.group || '',
        postalCode: newUser.postalCode,
        maleHeirs: newUser.maleHeirs,
        femaleHeirs: newUser.femaleHeirs,
      };

      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save');

      setSuccessMessage(`User "${newUser.name}" registered. ID: ${data.id || ''}`);
      // Reset
      setNewUser((prev) => ({
        ...prev,
        landownerNo: '',
        mobileNumber: '',
        name: '',
        alternativeName: '',
        wifeName: '',
        fatherName: '',
        address: '',
        postalCode: '',
        amount: '',
        amountPaid: '',
        donation: '',
        totalAmount: '',
        education: '',
        occupation: '',
        aadhaarNumber: '',
        clan: '',
        group: '',
        maleHeirs: 0,
        femaleHeirs: 0,
        outstandingAmount: '',
        photo: null,
        heirs: [],
      }));
      setErrors({});
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to save' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    setNewUser({
      receiptNumber: '6672',
      date: today,
      landownerNo: '',
      mobileNumber: '',
      name: '',
      alternativeName: '',
      wifeName: '',
      fatherName: '',
      address: '',
      postalCode: '',
      year: new Date().getFullYear().toString(),
      amount: '',
      amountPaid: '',
      donation: '',
      totalAmount: '',
      education: '',
      occupation: '',
      aadhaarNumber: '',
      clan: '',
      group: '',
      maleHeirs: 0,
      femaleHeirs: 0,
      outstandingAmount: '',
      photo: null,
      heirs: [],
    });
    setErrors({});
  };

  return (
    <div className="p-6 space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <p className="text-sm text-green-800">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="ml-auto text-green-600 hover:text-green-800">
              ×
            </button>
          </div>
        </div>
      )}

      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">❌</span>
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        </div>
      )}

      <div className="bg-blue-50 p-4 rounded-lg text-center">
        <h3 className="text-2xl font-bold text-blue-800 mb-2">காணியாளர்கள் வரி பதிவு</h3>
        <p className="text-blue-600">Landowners Tax Registration</p>
        
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
          <Link 
            to="/dashboard/registrations/text-entry" 
            className="px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Text Entry
          </Link>
          <Link 
            to="/dashboard/registrations/list" 
            className="px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
          >
            View All
          </Link>
          <Link 
            to="/dashboard/tax/entry" 
            className="px-3 py-1 bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
          >
            Tax Entry
          </Link>
          <Link 
            to="/dashboard/tax/list" 
            className="px-3 py-1 bg-teal-100 text-teal-800 rounded hover:bg-teal-200"
          >
            Tax List
          </Link>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-800">General Information</h4>
          <button
            type="button"
            onClick={clearForm}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            title="Clear all fields"
          >
            🗑️ Clear Form
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ரசீது எண (Receipt Number) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newUser.receiptNumber}
              onChange={(e) => handleFieldChange('receiptNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.receiptNumber ? 'border-red-300' : 'border-gray-300'
                }`}
              required
            />
            {errors.receiptNumber && <p className="text-xs text-red-500 mt-1">{errors.receiptNumber}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              தேதி (Date) <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={newUser.date}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.date ? 'border-red-300' : 'border-gray-300'
                }`}
              required
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-blue-800 mb-4">Landowner Details & Financials</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  காணியாளர் நெ. (Landowner No.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.landownerNo}
                  onChange={(e) => handleFieldChange('landownerNo', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.landownerNo ? 'border-red-300' : 'border-gray-300'
                    }`}
                  required
                />
                {errors.landownerNo && <p className="text-xs text-red-500 mt-1">{errors.landownerNo}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  கைபேசி எண் (Mobile Number) <span className="text-red-500">*</span>
                  {lookingUp && <span className="ml-2 text-blue-600 text-xs">🔍 Looking up...</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={newUser.mobileNumber}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.mobileNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={12}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => lookupUserByMobile(newUser.mobileNumber)}
                    disabled={lookingUp || newUser.mobileNumber.replace(/\D/g, '').length !== 10}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Lookup user details"
                  >
                    🔍
                  </button>
                </div>
                {errors.mobileNumber && <p className="text-xs text-red-500 mt-1">{errors.mobileNumber}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  💡 Auto-fills details from existing registrations when mobile is entered
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  பெயர் (Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  required
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">மாற்று பெயர் (Alternative Name)</label>
                <input
                  type="text"
                  value={newUser.alternativeName}
                  onChange={(e) => handleFieldChange('alternativeName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">மனைவி பெயர் (Wife's Name)</label>
                <input
                  type="text"
                  value={newUser.wifeName}
                  onChange={(e) => handleFieldChange('wifeName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  தந்தை பெயர் (Father's Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.fatherName}
                  onChange={(e) => handleFieldChange('fatherName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.fatherName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  required
                />
                {errors.fatherName && <p className="text-xs text-red-500 mt-1">{errors.fatherName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">முகவரி (Address) <span className="text-red-500">*</span></label>
                <textarea
                  value={newUser.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.address ? 'border-red-300' : 'border-gray-300'
                    }`}
                  rows={3}
                  placeholder="Enter complete address"
                  required
                />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">அஞ்சல் (Postal Code)</label>
                <input
                  type="text"
                  value={newUser.postalCode}
                  onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="6-digit postal code"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">வருடம் (Year)</label>
                <input
                  type="text"
                  value={newUser.year}
                  onChange={(e) => handleFieldChange('year', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">தொகை (Amount) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={newUser.amount}
                  onChange={(e) => handleFieldChange('amount', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.amount ? 'border-red-300' : 'border-gray-300'
                    }`}
                  required
                />
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">செலுத்தும் தொகை (Amount Paid)</label>
                <input
                  type="number"
                  value={newUser.amountPaid}
                  onChange={(e) => handleFieldChange('amountPaid', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">நன்கொடை (Donation)</label>
                <input
                  type="number"
                  value={newUser.donation}
                  onChange={(e) => handleFieldChange('donation', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">தொகை (Total Amount)</label>
                <input
                  type="number"
                  value={newUser.totalAmount}
                  onChange={(e) => handleFieldChange('totalAmount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-green-800 mb-4">Personal & Heir Details</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">படிப்பு (Education) <span className="text-red-500">*</span></label>
                <select
                  value={newUser.education}
                  onChange={(e) => handleFieldChange('education', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.education ? 'border-red-300' : 'border-gray-300'
                    }`}
                  required
                >
                  <option value="">Select Education Level</option>
                  {masterEducations.map((edu) => (
                    <option key={edu} value={edu}>
                      {edu}
                    </option>
                  ))}
                </select>
                {errors.education && <p className="text-xs text-red-500 mt-1">{errors.education}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">தொழில் (Occupation) <span className="text-red-500">*</span></label>
                <select
                  value={newUser.occupation}
                  onChange={(e) => handleFieldChange('occupation', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.occupation ? 'border-red-300' : 'border-gray-300'
                    }`}
                  required
                >
                  <option value="">Select Occupation</option>
                  {masterOccupations.map((occ) => (
                    <option key={occ} value={occ}>
                      {occ}
                    </option>
                  ))}
                </select>
                {errors.occupation && <p className="text-xs text-red-500 mt-1">{errors.occupation}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ஆதார் எண் (Aadhaar Number)</label>
                <input
                  type="text"
                  value={newUser.aadhaarNumber}
                  onChange={(e) => handleFormattedInput('aadhaarNumber', e.target.value, formatAadhaarNumber)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="XXXX-XXXX-XXXX (12 digits)"
                  maxLength={14}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">குலம் (Clan)</label>
                <select
                  value={newUser.clan}
                  onChange={(e) => handleFieldChange('clan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Clan</option>
                  {masterClans.map((clan) => (
                    <option key={clan} value={clan}>
                      {clan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">குழு (Group)</label>
                <select
                  value={newUser.group}
                  onChange={(e) => handleFieldChange('group', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Group</option>
                  {masterGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ஆண் (Male Heirs)</label>
                  <input
                    type="number"
                    value={newUser.maleHeirs}
                    onChange={(e) => handleFieldChange('maleHeirs', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">பெண் (Female Heirs)</label>
                  <input
                    type="number"
                    value={newUser.femaleHeirs}
                    onChange={(e) => handleFieldChange('femaleHeirs', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>

              {enablePhotoUpload && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                  <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <div className="text-4xl text-gray-400 mb-2">📷</div>
                      <p className="text-xs text-gray-500">(Size less than 100kb)</p>
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="photo-upload" />
                      <label htmlFor="photo-upload" className="mt-2 inline-block px-3 py-1 bg-blue-500 text-white text-xs rounded cursor-pointer hover:bg-blue-600">
                        Upload Photo
                      </label>
                      {newUser.photo && (
                        <div className="mt-3 flex items-center justify-center">
                          <img
                            src={URL.createObjectURL(newUser.photo)}
                            alt="Preview"
                            className="h-20 w-20 object-cover rounded border"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">நிலுவை தொகை (Outstanding Amount)</label>
                <input
                  type="number"
                  value={newUser.outstandingAmount}
                  onChange={(e) => handleFieldChange('outstandingAmount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-purple-800">வாரிசுதாரர்கள் (Heirs/Family Details)</h4>
          <button type="button" onClick={addHeir} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">
            + Add Heir
          </button>
        </div>

        {newUser.heirs && newUser.heirs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-purple-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">வ.எண் (S.No.)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">பெயர் (Name)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">இனம் (Race/Community)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">திருமணம் (Marriage)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">படிப்பு (Education)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">பி.தே (B.Date)</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {newUser.heirs.map((heir, index) => (
                  <tr key={heir.id} className="hover:bg-purple-50">
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{heir.serialNumber}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="text"
                        value={heir.name}
                        onChange={(e) => updateHeir(heir.id, 'name', e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent ${errors[`heir_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                        placeholder="Heir name"
                      />
                      {errors[`heir_${index}_name`] && <p className="text-xs text-red-500 mt-1">{errors[`heir_${index}_name`]}</p>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <select
                        value={heir.race}
                        onChange={(e) => updateHeir(heir.id, 'race', e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent ${errors[`heir_${index}_race`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                      >
                        <option value="">Select Race</option>
                        {masterRaces.map((race) => (
                          <option key={race} value={race}>
                            {race}
                          </option>
                        ))}
                      </select>
                      {errors[`heir_${index}_race`] && <p className="text-xs text-red-500 mt-1">{errors[`heir_${index}_race`]}</p>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <select
                        value={heir.maritalStatus}
                        onChange={(e) => updateHeir(heir.id, 'maritalStatus', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="unmarried">Unmarried</option>
                        <option value="married">Married</option>
                        <option value="divorced">Divorced</option>
                        <option value="widowed">Widowed</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="text"
                        value={heir.education}
                        onChange={(e) => updateHeir(heir.id, 'education', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Education"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="date"
                        value={heir.birthDate}
                        onChange={(e) => updateHeir(heir.id, 'birthDate', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => removeHeir(heir.id)} className="text-red-600 hover:text-red-900 p-1" title="Remove Heir">
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <p className="text-sm">No heirs added yet</p>
            <p className="text-xs mt-1">Click "Add Heir" to add detailed heir information</p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button type="button" onClick={clearForm} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
          வெளிய (Exit)
        </button>
        <button
          type="button"
          onClick={handleAddUser}
          disabled={isSubmitting}
          className={`px-6 py-2 text-white rounded-md ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isSubmitting ? 'Adding...' : 'பதிவு (Register)'}
        </button>
      </div>
    </div>
  );
}
