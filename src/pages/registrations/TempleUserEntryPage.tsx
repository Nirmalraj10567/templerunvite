import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';

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
  const { language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const editId = id ? parseInt(id, 10) : null;

  const t = {
    tamil: {
      pageTitle: 'காணியாளர்கள் வரி பதிவு',
      pageSubtitle: 'காணியாளர்கள் வரி பதிவு', // keep tamil only if desired
      generalInfo: 'பொது தகவல்',
      clearForm: 'அனைத்தையும் அழி',
      clearFormTitle: 'அனைத்தையும் அழி',
      landownerFinancials: 'காணியாளர் விவரங்கள் & நிதி',
      personalHeirDetails: 'தனிப்பட்ட & வாரிசு விவரங்கள்',
      outstandingAmount: 'நிலுவை தொகை',
      heirsTitle: 'வாரிசுதாரர்கள் (குடும்ப விவரங்கள்)',
      addHeir: 'வாரிசு சேர்',
      exit: 'வெளியேறு',
      register: 'பதிவு',
      lookingUp: 'தேடுகிறது...',
      autofillHint: 'கைபேசியை உள்ளிட்டவுடன் பதிவுகளில் இருந்து விவரங்கள் தானாக நிரப்படும்',
      receiptNumber: 'ரசீது எண்',
      date: 'தேதி',
      landownerNo: 'காணியாளர் எண்',
      mobileNumber: 'கைபேசி எண்',
      name: 'பெயர்',
      alternativeName: 'மாற்று பெயர்',
      wifeName: 'மனைவி பெயர்',
      fatherName: "தந்தை பெயர்",
      address: 'முகவரி',
      postalCode: 'அஞ்சல் குறியீடு',
      year: 'வருடம்',
      amount: 'தொகை',
      amountPaid: 'செலுத்திய தொகை',
      donation: 'நன்கொடை',
      totalAmount: 'மொத்த தொகை',
      educationLabel: 'படிப்பு',
      occupationLabel: 'தொழில்',
      aadhaarNumber: 'ஆதார் எண்',
      clan: 'குலம்',
      group: 'குழு',
      maleHeirs: 'ஆண் வாரிசுகள்',
      femaleHeirs: 'பெண் வாரிசுகள்',
      photo: 'புகைப்படம்',
      photoNote: '(100kb-க்கு குறைவு)',
      uploadPhoto: 'புகைப்படத்தை ஏற்று',
      replacePhoto: 'புகைப்படத்தை மாற்று',
      outstandingAmountLabel: 'நிலுவை தொகை',
      placeholderMobile: '10 இலக்க கைபேசி எண்',
      placeholderAadhaar: 'XXXX-XXXX-XXXX (12 இலக்கங்கள்)',
      placeholderAddress: 'முழு முகவரியை உள்ளிடவும்',
      placeholderPostal: '6 இலக்க அஞ்சல் குறியீடு',
      placeholderYear: 'ஆண்டு',
      placeholderHeirName: 'வாரிசு பெயர்',
      placeholderHeirEducation: 'படிப்பு',
      selectEducation: 'படிப்பை தேர்வு செய்க',
      selectOccupation: 'தொழிலை தேர்வு செய்க',
      selectRace: 'இனத்தை தேர்வு செய்க',
      selectClan: 'குலத்தை தேர்வு செய்க',
      selectGroup: 'குழுவை தேர்வு செய்க',
      heirsTable: {
        sno: 'வ.எண்',
        name: 'பெயர்',
        race: 'இனம்',
        marriage: 'திருமணம்',
        education: 'படிப்பு',
        bdate: 'பிறந்த தேதி',
        action: 'செயல்',
        noHeirs: 'வாரிசுகள் எதுவும் சேர்க்கப்படவில்லை',
        addHeirHint: 'விரிவான வாரிசு தகவலைச் சேர்க்க \'வாரிசு சேர்\' ஐ சொடுக்கவும்',
        maritalStatus: {
          unmarried: 'திருமணம் ஆகாதவர்',
          married: 'திருமணமானவர்',
          divorced: 'விவாகரத்து',
          widowed: 'விதவை/விதவன்',
        },
      },
      buttons: {
        lookupTitle: 'பயனர் விவரங்களைத் தேடு',
        removeHeirTitle: 'வாரிசை நீக்கு',
        adding: 'சேர்க்கப்படுகிறது...',
      },
    },
    english: {
      pageTitle: 'Landowners User Registration',
      pageSubtitle:'',
      generalInfo: 'General Info',
      clearForm: 'Clear Form',
      clearFormTitle: 'Clear all fields',
      landownerFinancials: 'Landowner Details & Financials',
      personalHeirDetails: 'Personal & Heir Details',
      outstandingAmount: 'Outstanding Amount',
      heirsTitle: 'Heirs/Family Details',
      addHeir: '+ Add Heir',
      exit: 'Exit',
      register: 'Register',
      lookingUp: 'Looking up...',
      autofillHint: 'Auto-fills details from existing registrations when mobile is entered',
      receiptNumber: 'Receipt Number',
      date: 'Date',
      landownerNo: 'Landowner No.',
      mobileNumber: 'Mobile Number',
      name: 'Name',
      alternativeName: 'Alternative Name',
      wifeName: "Wife's Name",
      fatherName: "Father's Name",
      address: 'Address',
      postalCode: 'Postal Code',
      year: 'Year',
      amount: 'Amount',
      amountPaid: 'Amount Paid',
      donation: 'Donation',
      totalAmount: 'Total Amount',
      educationLabel: 'Education',
      occupationLabel: 'Occupation',
      aadhaarNumber: 'Aadhaar Number',
      clan: 'Clan',
      group: 'Group',
      maleHeirs: 'Male Heirs',
      femaleHeirs: 'Female Heirs',
      photo: 'Photo',
      photoNote: '(Size less than 100kb)',
      uploadPhoto: 'Upload Photo',
      replacePhoto: 'Replace Photo',
      outstandingAmountLabel: 'Outstanding Amount',
      placeholderMobile: 'Enter 10-digit mobile number',
      placeholderAadhaar: 'XXXX-XXXX-XXXX (12 digits)',
      placeholderAddress: 'Enter complete address',
      placeholderPostal: '6-digit postal code',
      placeholderYear: 'Year',
      placeholderHeirName: 'Heir name',
      placeholderHeirEducation: 'Education',
      selectEducation: 'Select Education Level',
      selectOccupation: 'Select Occupation',
      selectRace: 'Select Race',
      selectClan: 'Select Clan',
      selectGroup: 'Select Group',
      heirsTable: {
        sno: 'S.No.',
        name: 'Name',
        race: 'Race/Community',
        marriage: 'Marriage',
        education: 'Education',
        bdate: 'B.Date',
        action: 'Action',
        noHeirs: 'No heirs added yet',
        addHeirHint: 'Click "Add Heir" to add detailed heir information',
        maritalStatus: {
          unmarried: 'Unmarried',
          married: 'Married',
          divorced: 'Divorced',
          widowed: 'Widowed',
        },
      },
      buttons: {
        lookupTitle: 'Lookup user details',
        removeHeirTitle: 'Remove Heir',
        adding: 'Adding...',
      },
    },
  } as const;

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
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

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
          const [clansRes, groupsRes, occupationsRes, educationsRes] = await Promise.all([
            fetch(`/api/master/clans/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/master/groups/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/master/occupations/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`/api/master/educations/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } })
          ]);

          if (clansRes.ok) {
            const clans = (await clansRes.json()).map((x: any) => x.name);
            setMasterClans(clans);
            setMasterRaces(clans); // Use clans data for races
          }
          if (groupsRes.ok) setMasterGroups((await groupsRes.json()).map((x: any) => x.name));
          if (occupationsRes.ok) setMasterOccupations((await occupationsRes.json()).map((x: any) => x.name));
          if (educationsRes.ok) setMasterEducations((await educationsRes.json()).map((x: any) => x.name));

        } catch (e) {
          console.error('Error loading master data', e);
        }
      })();
    }
  }, [user, token]);

  // Load existing registration for edit mode
  useEffect(() => {
    const loadForEdit = async () => {
      if (!editId || !token) return;
      try {
        const res = await fetch(`/api/registrations/${editId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load registration');
        const r = data.data;
        setNewUser((prev) => ({
          ...prev,
          receiptNumber: r.reference_number || '',
          date: r.date || today,
          landownerNo: r.subdivision || '',
          mobileNumber: r.mobile_number || '',
          name: r.name || '',
          alternativeName: r.alternative_name || '',
          wifeName: r.wife_name || '',
          fatherName: r.father_name || '',
          address: r.address || '',
          postalCode: r.postal_code || '',
          education: r.education || '',
          occupation: r.occupation || '',
          aadhaarNumber: r.aadhaar_number || '',
          clan: r.clan || '',
          group: r.group || '',
          maleHeirs: r.male_heirs || 0,
          femaleHeirs: r.female_heirs || 0,
          heirs: Array.isArray(r.heirs)
            ? r.heirs.map((h: any, idx: number) => ({
                id: Date.now() + idx,
                serialNumber: h.serial_number ?? (idx + 1),
                name: h.name || '',
                race: h.race || '',
                maritalStatus: (h.marital_status || 'unmarried') as Heir['maritalStatus'],
                education: h.education || '',
                birthDate: h.birth_date || '',
              }))
            : [],
        }));
        setExistingPhotoUrl(r.photo_path ? `/public${r.photo_path}` : null);
      } catch (e) {
        console.error('Failed to load registration for edit', e);
      }
    };
    loadForEdit();
  }, [editId, token]);

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

          // Leave form filled for review; do not clear
          setSuccessMessage(null);
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
    
    // Basic information validation
    if (!newUser.receiptNumber.trim()) 
      e.receiptNumber = t[language as 'tamil' | 'english'].receiptNumber + ' required';
    if (!newUser.date.trim()) 
      e.date = t[language as 'tamil' | 'english'].date + ' required';
  
    // Personal details validation
    if (!newUser.name.trim()) 
      e.name = t[language as 'tamil' | 'english'].name + ' required';
    if (!newUser.fatherName.trim()) 
      e.fatherName = t[language as 'tamil' | 'english'].fatherName + ' required';
  
    // Contact validation
    const cleanMobile = newUser.mobileNumber.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length !== 10) 
      e.mobileNumber = t[language as 'tamil' | 'english'].mobileNumber + ' (10 digits required)';
    if (!newUser.address.trim()) 
      e.address = t[language as 'tamil' | 'english'].address + ' required';
  
    // Education and occupation
    if (!newUser.education.trim()) 
      e.education = t[language as 'tamil' | 'english'].educationLabel + ' required';
    if (!newUser.occupation.trim()) 
      e.occupation = t[language as 'tamil' | 'english'].occupationLabel + ' required';
  
    // Heirs validation
    newUser.heirs?.forEach((h, i) => {
      if (!h.name.trim()) 
        e[`heir_${i}_name`] = t[language as 'tamil' | 'english'].heirsTable.name + ' required';
      if (!h.race.trim()) 
        e[`heir_${i}_race`] = t[language as 'tamil' | 'english'].heirsTable.race + ' required';
    });
  
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddUser = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      
      // Add all fields as strings
      const fields = {
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
        birthDate: today,
        village: '',
        mobileNumber: newUser.mobileNumber.replace(/\D/g, ''),
        aadhaarNumber: newUser.aadhaarNumber.replace(/\D/g, ''),
        panNumber: '',
        clan: newUser.clan,
        group: newUser.group || '',
        postalCode: newUser.postalCode,
        maleHeirs: String(newUser.maleHeirs),
        femaleHeirs: String(newUser.femaleHeirs)
      };
      
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });

      // Add heirs as JSON
      const heirsPayload = newUser.heirs.map(h => ({
        serialNumber: h.serialNumber,
        name: h.name,
        race: h.race,
        maritalStatus: h.maritalStatus,
        education: h.education,
        birthDate: h.birthDate,
      }));
      formData.append('heirs', JSON.stringify(heirsPayload));
      
      // Add photo if exists
      if (newUser.photo) {
        formData.append('photo', newUser.photo);
      }
      
      let res: Response;
      if (editId) {
        // Update via JSON
        const payload = Object.fromEntries(formData.entries());
        res = await fetch(`/api/registrations/${editId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } else {
        // Create with optional photo
        res = await fetch('/api/registrations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
      }
      
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) {
          // Map backend errors to form fields
          setErrors({
            ...data.errors,
            general: data.message
          });
        }
        throw new Error(data.message || 'Registration failed');
      }
      
      // After successful save, if a new photo was chosen in edit mode, upload it
      if (editId && newUser.photo) {
        try {
          const photoFd = new FormData();
          photoFd.append('photo', newUser.photo);
          const upRes = await fetch(`/api/registrations/${editId}/photo`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: photoFd,
          });
          if (upRes.ok) {
            setExistingPhotoUrl(null); // will be refreshed if needed
          }
        } catch (e) {
          console.error('Photo upload after update failed:', e);
        }
      }

      if (editId) {
        setSuccessMessage(language === 'tamil' ? 'பதிவு புதுப்பிக்கப்பட்டது' : 'Registration updated');
      } else {
        setSuccessMessage(`User "${newUser.name}" registered. ID: ${data.id || ''}`);
        clearForm();
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrors(prev => ({
        ...prev,
        general: err.message
      }));
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
        <h3 className="text-2xl font-bold text-blue-800 mb-2">{t[language as 'tamil' | 'english'].pageTitle}</h3>
    
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-lg font-medium text-gray-800">{t[language as 'tamil' | 'english'].generalInfo}</h4>
          <button
            type="button"
            onClick={clearForm}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            title={t[language as 'tamil' | 'english'].clearFormTitle}
          >
            🗑️ {t[language as 'tamil' | 'english'].clearForm}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t[language as 'tamil' | 'english'].receiptNumber} <span className="text-red-500">*</span>
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
              {t[language as 'tamil' | 'english'].date} <span className="text-red-500">*</span>
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
            <h4 className="text-lg font-medium text-blue-800 mb-4">{t[language as 'tamil' | 'english'].landownerFinancials}</h4>
            <div className="space-y-4">
              

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t[language as 'tamil' | 'english'].mobileNumber} <span className="text-red-500">*</span>
                  {lookingUp && <span className="ml-2 text-blue-600 text-xs">🔍 {t[language as 'tamil' | 'english'].lookingUp}</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={newUser.mobileNumber}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.mobileNumber ? 'border-red-300' : 'border-gray-300'
                      }`}
                    placeholder={t[language as 'tamil' | 'english'].placeholderMobile}
                    maxLength={12}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => lookupUserByMobile(newUser.mobileNumber)}
                    disabled={lookingUp || newUser.mobileNumber.replace(/\D/g, '').length !== 10}
                    className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t[language as 'tamil' | 'english'].buttons.lookupTitle}
                  >
                    🔍
                  </button>
                </div>
                {errors.mobileNumber && <p className="text-xs text-red-500 mt-1">{errors.mobileNumber}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  💡 {t[language as 'tamil' | 'english'].autofillHint}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t[language as 'tamil' | 'english'].name} <span className="text-red-500">*</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].alternativeName}</label>
                <input
                  type="text"
                  value={newUser.alternativeName}
                  onChange={(e) => handleFieldChange('alternativeName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].wifeName}</label>
                <input
                  type="text"
                  value={newUser.wifeName}
                  onChange={(e) => handleFieldChange('wifeName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t[language as 'tamil' | 'english'].fatherName} <span className="text-red-500">*</span>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].address} <span className="text-red-500">*</span></label>
                <textarea
                  value={newUser.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.address ? 'border-red-300' : 'border-gray-300'
                    }`}
                  rows={3}
                  placeholder={t[language as 'tamil' | 'english'].placeholderAddress}
                  required
                />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].postalCode}</label>
                <input
                  type="text"
                  value={newUser.postalCode}
                  onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t[language as 'tamil' | 'english'].placeholderPostal}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].year}</label>
                <input
                  type="text"
                  value={newUser.year}
                  onChange={(e) => handleFieldChange('year', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-lg font-medium text-green-800 mb-4">{t[language as 'tamil' | 'english'].personalHeirDetails}</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].educationLabel} <span className="text-red-500">*</span></label>
                <select
                  value={newUser.education}
                  onChange={(e) => handleFieldChange('education', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.education ? 'border-red-300' : 'border-gray-300'
                    }`}
                  required
                >
                  <option value="">{t[language as 'tamil' | 'english'].selectEducation}</option>
                  {masterEducations.map((edu) => (
                    <option key={edu} value={edu}>
                      {edu}
                    </option>
                  ))}
                </select>
                {errors.education && <p className="text-xs text-red-500 mt-1">{errors.education}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].occupationLabel} <span className="text-red-500">*</span></label>
                <select
                  value={newUser.occupation}
                  onChange={(e) => handleFieldChange('occupation', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.occupation ? 'border-red-300' : 'border-gray-300'
                    }`}
                  required
                >
                  <option value="">{t[language as 'tamil' | 'english'].selectOccupation}</option>
                  {masterOccupations.map((occ) => (
                    <option key={occ} value={occ}>
                      {occ}
                    </option>
                  ))}
                </select>
                {errors.occupation && <p className="text-xs text-red-500 mt-1">{errors.occupation}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].aadhaarNumber}</label>
                <input
                  type="text"
                  value={newUser.aadhaarNumber}
                  onChange={(e) => handleFormattedInput('aadhaarNumber', e.target.value, formatAadhaarNumber)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t[language as 'tamil' | 'english'].placeholderAadhaar}
                  maxLength={14}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].clan}</label>
                <select
                  value={newUser.clan}
                  onChange={(e) => handleFieldChange('clan', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t[language as 'tamil' | 'english'].selectClan}</option>
                  {masterClans.map((clan) => (
                    <option key={clan} value={clan}>
                      {clan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].group}</label>
                <select
                  value={newUser.group}
                  onChange={(e) => handleFieldChange('group', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t[language as 'tamil' | 'english'].selectGroup}</option>
                  {masterGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].maleHeirs}</label>
                  <input
                    type="number"
                    value={newUser.maleHeirs}
                    onChange={(e) => handleFieldChange('maleHeirs', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t[language as 'tamil' | 'english'].femaleHeirs}</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t[language as 'tamil' | 'english'].photo}</label>
                  <div className="w-full h-32 bg-gray-200 rounded-lg border-2 border-dashed border-gray-300 relative overflow-hidden">
                    {newUser.photo ? (
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <img
                          src={URL.createObjectURL(newUser.photo)}
                          alt="Preview"
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      </div>
                    ) : existingPhotoUrl ? (
                      <div className="absolute inset-0 flex items-center justify-center p-2">
                        <img
                          src={existingPhotoUrl}
                          alt="Saved"
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                        <div className="text-4xl text-gray-400 mb-2">📷</div>
                        <p className="text-xs text-gray-500">{t[language as 'tamil' | 'english'].photoNote}</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" id="photo-upload" />
                    <label
                      htmlFor="photo-upload"
                      className="absolute bottom-2 right-2 inline-block px-3 py-1 bg-blue-500 text-white text-xs rounded cursor-pointer hover:bg-blue-600 shadow"
                    >
                      {newUser.photo
                        ? t[language as 'tamil' | 'english'].replacePhoto
                        : t[language as 'tamil' | 'english'].uploadPhoto}
                    </label>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-purple-800">{t[language as 'tamil' | 'english'].heirsTitle}</h4>
          <button type="button" onClick={addHeir} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700">
            {t[language as 'tamil' | 'english'].addHeir}
          </button>
        </div>

        {newUser.heirs && newUser.heirs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-purple-100">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">{t[language as 'tamil' | 'english'].heirsTable.sno}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">{t[language as 'tamil' | 'english'].heirsTable.name}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">{t[language as 'tamil' | 'english'].heirsTable.race}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">{t[language as 'tamil' | 'english'].heirsTable.marriage}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">{t[language as 'tamil' | 'english'].heirsTable.education}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">{t[language as 'tamil' | 'english'].heirsTable.bdate}</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-purple-800 uppercase tracking-wider">{t[language as 'tamil' | 'english'].heirsTable.action}</th>
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
                        placeholder={t[language as 'tamil' | 'english'].placeholderHeirName}
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
                        <option value="">{t[language as 'tamil' | 'english'].selectRace}</option>
                        {masterClans.map((race) => (
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
                        <option value="unmarried">{t[language as 'tamil' | 'english'].heirsTable.maritalStatus.unmarried}</option>
                        <option value="married">{t[language as 'tamil' | 'english'].heirsTable.maritalStatus.married}</option>
                        <option value="divorced">{t[language as 'tamil' | 'english'].heirsTable.maritalStatus.divorced}</option>
                        <option value="widowed">{t[language as 'tamil' | 'english'].heirsTable.maritalStatus.widowed}</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="text"
                        value={heir.education}
                        onChange={(e) => updateHeir(heir.id, 'education', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                        placeholder={t[language as 'tamil' | 'english'].placeholderHeirEducation}
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        type="date"
                        value={heir.birthDate}
                        onChange={(e) => updateHeir(heir.id, 'birthDate', e.target.value)}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent ${errors[`heir_${index}_birthDate`] ? 'border-red-300' : 'border-gray-300'
                          }`}
                      />
                      {errors[`heir_${index}_birthDate`] && <p className="text-xs text-red-500 mt-1">{errors[`heir_${index}_birthDate`]}</p>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => removeHeir(heir.id)} className="text-red-600 hover:text-red-900 p-1" title={t[language as 'tamil' | 'english'].buttons.removeHeirTitle}>
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
            <p className="text-sm">{t[language as 'tamil' | 'english'].heirsTable.noHeirs}</p>
            <p className="text-xs mt-1">{t[language as 'tamil' | 'english'].heirsTable.addHeirHint}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button type="button" onClick={clearForm} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
          {t[language as 'tamil' | 'english'].exit}
        </button>
        <button
          type="button"
          onClick={handleAddUser}
          disabled={isSubmitting}
          className={`px-6 py-2 text-white rounded-md ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isSubmitting ? t[language as 'tamil' | 'english'].buttons.adding : t[language as 'tamil' | 'english'].register}
        </button>
      </div>
    </div>
  );
}
