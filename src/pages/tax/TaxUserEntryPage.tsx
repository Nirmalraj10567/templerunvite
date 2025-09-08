import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import the useTranslation hook
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import axios from 'axios';

interface Heir {
  id: string;
  serialNumber: number;
  name: string;
  race: string;
  maritalStatus: string;
  education: string;
  birthDate: string;
}

export default function TaxUserEntryPage() {
  const { t, i18n } = useTranslation(); // Initialize the translation hook
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [form, setForm] = useState({
    referenceNumber: '',
    date: today,
    subdivision: '',
    name: '',
    alternativeName: '',
    wifeName: '',
    education: '',
    occupation: '',
    fatherName: '',
    address: '',
    birthDate: '',
    village: '',
    mobileNumber: '',
    aadhaarNumber: '',
    panNumber: '',
    clan: '',
    group: '',
    postalCode: '',
    maleHeirs: 0,
    femaleHeirs: 0,
    year: new Date().getFullYear(),
    taxAmount: '',
    amountPaid: '',
    outstandingAmount: '',
    transferTo: '',
  });

  const [newUser, setNewUser] = useState({
    heirs: [] as Heir[],
    photo: null as File | null,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: number; value: string; label: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [taxBreakdown, setTaxBreakdown] = useState<any[]>([]);
  const [cumulativeInfo, setCumulativeInfo] = useState<any>(null);
  const [initialDue, setInitialDue] = useState<number>(0); // current year tax + previous unpaid, from backend settings

  // Master data for dropdowns
  const [masterClans, setMasterClans] = useState<string[]>([]);
  const [masterGroups, setMasterGroups] = useState<string[]>([]);
  const [masterOccupations, setMasterOccupations] = useState<string[]>([]);
  const [masterEducations, setMasterEducations] = useState<string[]>([]);

  // Subdivision options
  const subdivisions = [
    { value: 'subdivision1', label: 'Sub 1', tamil: 'உட்பிரிவு 1' },
    { value: 'subdivision2', label: 'Sub 2', tamil: 'உட்பிரிவு 2' },
    { value: 'subdivision3', label: 'Sub 3', tamil: 'உட்பிரிவு 3' },
    { value: 'subdivision4', label: 'Sub 4', tamil: 'உட்பிரிவு 4' }
  ];

  // Master data for races
  const masterRaces = [
    { value: 'tamil', label: 'Tamil', tamil: 'தமிழ்' },
    { value: 'telugu', label: 'Telugu', tamil: 'தெலுங்கு' },
    { value: 'malayalam', label: 'Malayalam', tamil: 'மலையாளம்' },
    { value: 'kannada', label: 'Kannada', tamil: 'கன்னடம்' },
    { value: 'hindi', label: 'Hindi', tamil: 'இந்தி' },
    { value: 'other', label: 'Other', tamil: 'மற்றவை' }
  ];

  // Marital status options
  const maritalStatusOptions = [
    { value: 'unmarried', label: 'Unmarried', tamil: 'திருமணமாகாத' },
    { value: 'married', label: 'Married', tamil: 'திருமணமான' },
    { value: 'divorced', label: 'Divorced', tamil: 'விவாகரத்து' },
    { value: 'widowed', label: 'Widowed', tamil: 'விதவை' }
  ];

  // Load master data from backend based on temple ID
  useEffect(() => {
    if (user?.templeId && token) {
      (async () => {
        setLoading(true);
        try {
          const [clansRes, groupsRes, occupationsRes, educationsRes] = await Promise.all([
            fetch(`/api/master/clans/${user.templeId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`/api/master/groups/${user.templeId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`/api/master/occupations/${user.templeId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`/api/master/educations/${user.templeId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
          ]);

          if (clansRes.ok) {
            const clans = await clansRes.json();
            setMasterClans(clans.map((x: any) => x.name));
          }
          if (groupsRes.ok) {
            const groups = await groupsRes.json();
            setMasterGroups(groups.map((x: any) => x.name));
          }
          if (occupationsRes.ok) {
            const occupations = await occupationsRes.json();
            setMasterOccupations(occupations.map((x: any) => x.name));
          }
          if (educationsRes.ok) {
            const educations = await educationsRes.json();
            setMasterEducations(educations.map((x: any) => x.name));
          } else {
            // Fallback static education options
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
          }
        } catch (e) {
          console.error('Error loading master data', e);
          setErr('Failed to load master data / முதன்மை தரவு ஏற்ற முடியவில்லை');
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, [user, token]);

  // Load ledger categories for Transfer To Account
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const resp = await axios.get<any>('/api/ledger/categories', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = (resp?.data && Array.isArray(resp.data.data)) ? resp.data.data : (Array.isArray(resp?.data) ? resp.data : []);
        const mapped = (data || []).map((item: any, index: number) => {
          if (typeof item === 'string') return { id: index + 1, value: item, label: item };
          return { id: item.id || index + 1, value: item.value || item.label, label: item.label || item.value };
        });
        setCategories(mapped);
      } catch (e) {
        console.error('Failed to load ledger categories', e);
      }
    })();
  }, [token]);

  // Load tax amount for current year on mount
  useEffect(() => {
    if (user?.templeId && token && !loading) {
      fetchTaxAmountForYear(form.year);
    }
  }, [user?.templeId, token, loading]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Helper to show text in current language only
  const L = (en: string, ta: string) => (i18n.language?.startsWith('ta') ? ta : en);

  // Input formatting functions
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

  const handleFormattedInput = (field: string, value: string, formatter: (v: string) => string) => {
    const formatted = formatter(value);
    setForm(prev => ({ ...prev, [field]: formatted }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Mobile number lookup function
  const lookupUserByMobile = async (mobileNumber: string) => {
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) return;

    setLookingUp(true);
    setErr(null);

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
          setForm(prev => ({
            ...prev,
            name: userData.name || '',
            alternativeName: userData.alternative_name || '',
            wifeName: userData.wife_name || '',
            fatherName: userData.father_name || '',
            address: userData.address || '',
            birthDate: userData.birth_date || '',
            village: userData.village || '',
            aadhaarNumber: userData.aadhaar_number ? formatAadhaarNumber(userData.aadhaar_number) : '',
            panNumber: userData.pan_number || '',
            clan: userData.clan || '',
            group: userData.group || '',
            postalCode: userData.postal_code || '',
            education: userData.education || '',
            occupation: userData.occupation || '',
            maleHeirs: userData.male_heirs || 0,
            femaleHeirs: userData.female_heirs || 0,
          }));

          setMsg(`✅ Found: ${userData.name} - Registration ID ${userData.id} / கண்டுபிடிக்கப்பட்டது: ${userData.name} - பதிவு ID ${userData.id}`);
          setTimeout(() => setMsg(null), 5000);
        } else {
          // No existing registration found - show info message
          setMsg(`No existing registration found for this mobile / இந்த கைபேசி எண்ணுக்கு பதிவு இல்லை`);
          setTimeout(() => setMsg(null), 3000);
        }
      }
    } catch (error) {
      console.error('Error looking up user:', error);
      // Don't show error for lookup failure, just continue with manual entry
    } finally {
      setLookingUp(false);
    }
  };

  // Handle mobile number change with lookup and cumulative calculation
  const handleMobileChange = (value: string) => {
    const formatted = formatMobileNumber(value);
    setForm(prev => ({ ...prev, mobileNumber: formatted }));
    if (errors.mobileNumber) setErrors(prev => ({ ...prev, mobileNumber: '' }));

    // Trigger lookup when mobile number is complete (10 digits) with debounce
    const cleanMobile = value.replace(/\D/g, '');
    if (cleanMobile.length === 10 && user?.templeId && token) {
      // Add a small delay to avoid rapid API calls
      setTimeout(() => {
        // Check if mobile number is still the same (user hasn't changed it)
        if (form.mobileNumber === formatted) {
          lookupUserByMobile(formatted);
          // Also fetch cumulative tax calculation
          fetchCumulativeTax(formatted, form.year);
        }
      }, 500);
    }
  };

  // Fetch cumulative tax calculation for mobile number
  const fetchCumulativeTax = async (mobileNumber: string, year: number) => {
    if (!token || !mobileNumber || !year) return;

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) return;

    try {
      const response = await fetch(`/api/tax-calculations/cumulative/${cleanMobile}?currentYear=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const { cumulativeOutstanding, currentYearTax, totalTaxDue, yearBreakdown } = data.data;
          
          setForm(prev => ({ 
            ...prev, 
            taxAmount: currentYearTax.toString(),
            outstandingAmount: totalTaxDue.toString()
          }));
          setInitialDue(totalTaxDue);

          // Store breakdown for display
          setTaxBreakdown(yearBreakdown || []);
          setCumulativeInfo({
            cumulativeOutstanding,
            currentYearTax,
            totalTaxDue,
            hasExistingRegistration: data.data.hasExistingRegistration
          });

          // Show breakdown message
          const breakdownMsg = yearBreakdown
            .filter((b: any) => b.outstanding > 0)
            .map((b: any) => `${b.year}: ₹${b.outstanding}`)
            .join(', ');
          
          if (data.data.isNewUser && cumulativeOutstanding > 0) {
            setMsg(`🆕 NEW Registration: Total ₹${totalTaxDue} (Previous Years: ₹${cumulativeOutstanding}, ${form.year}: ₹${currentYearTax}) | ${breakdownMsg}`);
          } else if (cumulativeOutstanding > 0) {
            setMsg(`📊 Existing User Outstanding: ₹${totalTaxDue} (Previous: ₹${cumulativeOutstanding}, Current: ₹${currentYearTax})`);
          } else {
            setMsg(`✅ Current year tax: ₹${currentYearTax} (No previous outstanding)`);
          }
          setTimeout(() => setMsg(null), 8000);
        }
      }
    } catch (error) {
      console.error('Error fetching cumulative tax:', error);
    }
  };

  // Fetch tax amount for selected year (fallback if no mobile)
  const fetchTaxAmountForYear = async (year: number) => {
    if (!token || !year) return;

    try {
      const response = await fetch(`/api/tax-settings/year/${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setForm(prev => ({ 
            ...prev, 
            taxAmount: data.data.tax_amount.toString(),
            outstandingAmount: data.data.tax_amount.toString()
          }));
          setInitialDue(Number(data.data.tax_amount) || 0);
          setMsg(`Tax amount for ${year}: ₹${data.data.tax_amount} loaded / ${year} வரி தொகை: ₹${data.data.tax_amount} ஏற்றப்பட்டது`);
          setTimeout(() => setMsg(null), 3000);
        } else {
          setForm(prev => ({ ...prev, taxAmount: '', outstandingAmount: '' }));
          setMsg(`No tax setting found for year ${year} / ${year} ஆண்டுக்கான வரி அமைப்பு இல்லை`);
          setTimeout(() => setMsg(null), 3000);
        }
      }
    } catch (error) {
      console.error('Error fetching tax amount:', error);
    }
  };

  // Handle year change
  const handleYearChange = (year: number) => {
    setForm(prev => ({ ...prev, year }));
    // If mobile number exists, fetch cumulative calculation, otherwise just year amount
    if (form.mobileNumber && form.mobileNumber.replace(/\D/g, '').length === 10) {
      fetchCumulativeTax(form.mobileNumber, year);
    } else {
      fetchTaxAmountForYear(year);
    }
  };

  // Calculate outstanding amount when amount paid changes
  const handleAmountPaidChange = (amountPaid: string) => {
    const paid = parseFloat(amountPaid) || 0;
    const totalDue = Number.isFinite(initialDue) ? initialDue : (parseFloat(form.outstandingAmount) || 0);
    const outstanding = Math.max(0, totalDue - paid);
    
    setForm(prev => ({ 
      ...prev, 
      amountPaid,
      outstandingAmount: outstanding.toString()
    }));
  };

  const addHeir = () => {
    const newHeir: Heir = {
      id: Date.now().toString(),
      serialNumber: newUser.heirs.length + 1,
      name: '',
      race: '',
      maritalStatus: 'unmarried',
      education: '',
      birthDate: '',
    };
    setNewUser(prev => ({
      ...prev,
      heirs: [...prev.heirs, newHeir]
    }));
  };

  const updateHeir = (id: string, field: keyof Heir, value: string) => {
    setNewUser(prev => ({
      ...prev,
      heirs: prev.heirs.map(heir =>
        heir.id === id ? { ...heir, [field]: value } : heir
      )
    }));
  };

  const removeHeir = (id: string) => {
    setNewUser(prev => ({
      ...prev,
      heirs: prev.heirs.filter(heir => heir.id !== id)
        .map((heir, index) => ({ ...heir, serialNumber: index + 1 }))
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024) {
        setErr('Photo size must be less than 100KB / புகைப்படம் 100KB-க்கும் குறைவாக இருக்க வேண்டும்');
        return;
      }
      setNewUser(prev => ({ ...prev, photo: file }));
      setErr(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Name is required / பெயர் அவசியம்';
    }

    if (!form.fatherName.trim()) {
      newErrors.fatherName = 'Father name is required / தந்தை பெயர் அவசியம்';
    }

    if (!form.address.trim()) {
      newErrors.address = 'Address is required / முகவரி அவசியம்';
    }

    if (form.mobileNumber && form.mobileNumber.replace(/\D/g, '').length !== 10) {
      newErrors.mobileNumber = 'Mobile number must be 10 digits / கைபேசி எண் 10 இலக்கமாக இருக்க வேண்டும்';
    }

    if (form.aadhaarNumber && form.aadhaarNumber.replace(/\D/g, '').length !== 12) {
      newErrors.aadhaarNumber = 'Aadhaar number must be 12 digits / ஆதார் எண் 12 இலக்கமாக இருக்க வேண்டும்';
    }

    newUser.heirs.forEach((heir, index) => {
      if (!heir.name.trim()) {
        newErrors[`heir_${index}_name`] = 'Heir name is required / வாரிசு பெயர் அவசியம்';
      }
      if (!heir.race) {
        newErrors[`heir_${index}_race`] = 'Race is required / இனம் அவசியம்';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    if (!validateForm()) {
      setErr('Please fix the validation errors / தவறுகளை சரிசெய்யவும்');
      return;
    }

    if (!user?.templeId) {
      setErr('Temple ID not found. Please login again / கோயில் ID கிடைக்கவில்லை. மீண்டும் உள்நுழையவும்');
      return;
    }

    setSaving(true);
    setErr(null);
    setMsg(null);

    try {
      // Create FormData for multipart request
      const formData = new FormData();
      
      // Append all form fields
      formData.append('referenceNumber', form.referenceNumber);
      formData.append('date', form.date);
      formData.append('subdivision', form.subdivision);
      formData.append('name', form.name);
      formData.append('alternativeName', form.alternativeName);
      formData.append('wifeName', form.wifeName);
      formData.append('education', form.education);
      formData.append('occupation', form.occupation);
      formData.append('fatherName', form.fatherName);
      formData.append('address', form.address);
      formData.append('birthDate', form.birthDate);
      formData.append('village', form.village);
      formData.append('mobileNumber', form.mobileNumber.replace(/\D/g, ''));
      formData.append('aadhaarNumber', form.aadhaarNumber.replace(/\D/g, ''));
      formData.append('panNumber', form.panNumber);
      formData.append('clan', form.clan);
      formData.append('group', form.group);
      formData.append('postalCode', form.postalCode);
      formData.append('maleHeirs', form.maleHeirs.toString());
      formData.append('femaleHeirs', form.femaleHeirs.toString());
      formData.append('year', form.year.toString());
      formData.append('taxAmount', form.taxAmount);
      formData.append('amountPaid', form.amountPaid);
      formData.append('outstandingAmount', form.outstandingAmount);
      formData.append('transferTo', (form as any).transferTo || '');
      if ((form as any).donationAmount) formData.append('donationAmount', (form as any).donationAmount);
      formData.append('templeId', user.templeId.toString());

      // Append heirs as JSON array if present
      if (newUser.heirs && newUser.heirs.length > 0) {
        const heirsPayload = newUser.heirs.map(h => ({
          serialNumber: h.serialNumber,
          name: h.name,
          race: h.race,
          maritalStatus: h.maritalStatus,
          education: h.education,
          birthDate: h.birthDate,
        }));
        formData.append('heirs', JSON.stringify(heirsPayload));
      }
      
      // Append photo if exists
      if (newUser.photo) {
        formData.append('photo', newUser.photo);
      }

      const res = await fetch('/api/tax-registrations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to save / சேமிக்க முடியவில்லை');

      setMsg(`Tax registration ID ${data.id} saved successfully / வரி பதிவு ID ${data.id} வெற்றிகரமாக சேமிக்கப்பட்டது`);
      setTimeout(() => setMsg(null), 5000);

      // Reset form
      setForm({
        referenceNumber: '',
        date: today,
        subdivision: '',
        name: '',
        alternativeName: '',
        wifeName: '',
        education: '',
        occupation: '',
        fatherName: '',
        address: '',
        birthDate: '',
        village: '',
        mobileNumber: '',
        aadhaarNumber: '',
        panNumber: '',
        clan: '',
        group: '',
        postalCode: '',
        maleHeirs: 0,
        femaleHeirs: 0,
        year: new Date().getFullYear(),
        taxAmount: '',
        amountPaid: '',
        outstandingAmount: '',
        transferTo: '',
        donationAmount: '',
      });

      setNewUser({
        heirs: [],
        photo: null,
      });

    } catch (e: any) {
      setErr(e.message || 'Failed to save / சேமிக்க முடியவில்லை');
    } finally {
      setSaving(false);
    }
  };

  const clearForm = () => {
    const currentYear = new Date().getFullYear();
    setForm({
      referenceNumber: '',
      date: today,
      subdivision: '',
      name: '',
      alternativeName: '',
      wifeName: '',
      education: '',
      occupation: '',
      fatherName: '',
      address: '',
      birthDate: '',
      village: '',
      mobileNumber: '',
      aadhaarNumber: '',
      panNumber: '',
      clan: '',
      group: '',
      postalCode: '',
      maleHeirs: 0,
      femaleHeirs: 0,
      year: currentYear,
      taxAmount: '',
      amountPaid: '',
      outstandingAmount: '',
      transferTo: '',
      donationAmount: '',
    });
    // Fetch tax amount for current year after clearing
    fetchTaxAmountForYear(currentYear);
    setNewUser({
      heirs: [],
      photo: null,
    });
    setErrors({});
    setMsg(null);
    setErr(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{L('Loading master data...', 'முதன்மை தரவு ஏற்றுகிறது...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-3">
      <div className="max-w-7xl mx-auto">
        {/* Language Toggle + Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {L('Tax Registration', 'வரி பதிவு')}
            </h1>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => i18n.changeLanguage('en')}
              className={`px-2 py-1 text-xs rounded border ${i18n.language?.startsWith('ta') ? 'bg-white text-gray-700' : 'bg-blue-600 text-white border-blue-600'}`}
              title="Switch to English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => i18n.changeLanguage('ta')}
              className={`px-2 py-1 text-xs rounded border ${i18n.language?.startsWith('ta') ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
              title="தமிழ்க்கு மாற்று"
            >
              தமிழ்
            </button>
          </div>
          <div className="ml-4">
            <button
              type="button"
              onClick={() => {
                const d = form.date || new Date().toISOString().slice(0,10);
                navigate(`/dashboard/reports/daily?date=${d}`);
              }}
              className="px-3 py-1 text-xs rounded border bg-white text-gray-700 hover:bg-gray-50"
            >
              {L('Go to Daily Report', 'தினசரி அறிக்கைக்கு செல்ல')}
            </button>
          </div>
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          {/* Status Messages */}
          {(msg || err) && (
            <div className="mb-3">
              <Alert variant={err ? 'destructive' : 'default'}>
                <AlertTitle>{err ? 'Error / பிழை' : 'Success / வெற்றி'}</AlertTitle>
                <AlertDescription>{err ? err : msg}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Left Column - Main Form Fields (3/4 width) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Basic Info Section */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{L('Basic Information', 'அடிப்படை தகவல்')}</h3>
                  <button
                    type="button"
                    onClick={clearForm}
                    className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                    title={L('Clear all fields', 'அனைத்தையும் அழி')}
                  >
                    🗑️ {L('Clear', 'அழிக்க')}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Date', 'தேதி')}</label>
                    <input
                      type="date"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.date}
                      onChange={e => set('date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Year', 'வருடம்')} *</label>
                    <select
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.year}
                      onChange={e => handleYearChange(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Ref No', 'குறிப்பு எண்')}</label>
                    <input
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.referenceNumber}
                      onChange={e => set('referenceNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Subdivision', 'உட்பிரிவு')}</label>
                    <select
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.subdivision}
                      onChange={e => set('subdivision', e.target.value)}
                    >
                      <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                      {subdivisions.map((sub) => (
                        <option key={sub.value} value={sub.value}>
                          {L(sub.label, sub.tamil)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Transfer To Account */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{L('Transfer To Account', 'எந்த கணக்கிற்கு மாற்றுவது')}</h3>
                <select
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  value={(form as any).transferTo || ''}
                  onChange={e => set('transferTo' as any, e.target.value)}
                >
                  <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{L('Choose the ledger account to transfer this amount into.', 'இந்தத் தொகை மாற்றப்படும் லெட்ஜர் கணக்கைத் தேர்ந்தெடுக்கவும்.')}</p>
              </div>

              {/* Amounts Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{L('Amounts', 'தொகைகள்')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Amount', 'தொகை')}</label>
                    <input
                      readOnly
                      value={form.taxAmount}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Amount due', 'நிறுவை தொகை')}</label>
                    <input
                      readOnly
                      value={form.outstandingAmount}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Amount to be paid', 'செலுத்தும் தொகை')}</label>
                    <input
                      value={form.amountPaid}
                      onChange={e => handleAmountPaidChange(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Donation amount', 'நன்கொடை தொகை')}</label>
                    <input
                      value={(form as any).donationAmount || ''}
                      onChange={e => set('donationAmount' as any, e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{L('Amount due includes previous unpaid amounts based on year-wise settings.', 'நிறுவை தொகையில் ஆண்டு-அமைப்பின் அடிப்படையில் முந்தைய நிலுவையும் சேர்க்கப்பட்டுள்ளது.')}</p>
              </div>

              {/* Personal Details */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{L('Personal Details', 'தனிப்பட்ட விவரங்கள்')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Name', 'பெயர்')} *</label>
                    <input
                      className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      value={form.name}
                      onChange={e => set('name', e.target.value)}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Alt Name', 'மாற்று பெயர்')}</label>
                    <input
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.alternativeName}
                      onChange={e => set('alternativeName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Spouse', 'மனைவி')}</label>
                    <input
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.wifeName}
                      onChange={e => set('wifeName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Father', 'தந்தை')} *</label>
                    <input
                      className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.fatherName ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      value={form.fatherName}
                      onChange={e => set('fatherName', e.target.value)}
                    />
                    {errors.fatherName && <p className="text-red-500 text-xs mt-1">{errors.fatherName}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Birth Date', 'பிறந்த தேதி')}</label>
                    <input
                      type="date"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.birthDate}
                      onChange={e => set('birthDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Education', 'கல்வி')}</label>
                    <select
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.education}
                      onChange={e => set('education', e.target.value)}
                    >
                      <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                      {masterEducations.map((edu) => (
                        <option key={edu} value={edu}>{edu}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Occupation', 'தொழில்')}</label>
                    <select
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.occupation}
                      onChange={e => set('occupation', e.target.value)}
                    >
                      <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                      {masterOccupations.map((occ) => (
                        <option key={occ} value={occ}>{occ}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Village', 'கிராமம்')}</label>
                    <input
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.village}
                      onChange={e => set('village', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">
                      {L('Mobile', 'கைபேசி')}
                      {lookingUp && <span className="ml-2 text-blue-600 text-xs">🔍 {L('Looking up...', 'தேடுகிறது...')}</span>}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        className={`flex-1 px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.mobileNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                        value={form.mobileNumber}
                        onChange={e => handleMobileChange(e.target.value)}
                        placeholder={L('Enter 10-digit mobile', '10 இலக்க கைபேசி எண்')}
                        maxLength={12}
                      />
                      <button
                        type="button"
                        onClick={() => lookupUserByMobile(form.mobileNumber)}
                        disabled={lookingUp || form.mobileNumber.replace(/\D/g, '').length !== 10}
                        className="px-2 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={L('Lookup user details', 'பயனர் விவரங்களைத் தேடு')}
                      >
                        🔍
                      </button>
                    </div>
                    {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      💡 {L('Auto-fills details from existing registrations when mobile is entered', 'கைபேசியை உள்ளிட்டவுடன் பதிவுகளில் இருந்து விவரங்கள் தானாக நிரப்படும்')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{L('Address', 'முகவரி')} *</h3>
                <textarea
                  className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  rows={2}
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                />
                {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
              </div>

              {/* ID Numbers & Other Info */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{L('ID & Other Details', 'அடையாள விவரங்கள்')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Aadhaar', 'ஆதார்')}</label>
                    <input
                      type="text"
                      className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.aadhaarNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      value={form.aadhaarNumber}
                      onChange={e => handleFormattedInput('aadhaarNumber', e.target.value, formatAadhaarNumber)}
                      placeholder="XXXX-XXXX-XXXX"
                      maxLength={14}
                    />
                    {errors.aadhaarNumber && <p className="text-red-500 text-xs mt-1">{errors.aadhaarNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('PAN', 'பான்')}</label>
                    <input
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.panNumber}
                      onChange={e => set('panNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Clan', 'குலம்')}</label>
                    <select
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.clan}
                      onChange={e => set('clan', e.target.value)}
                    >
                      <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                      {masterClans.map((clan) => (
                        <option key={clan} value={clan}>{clan}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Group', 'குழு')}</label>
                    <select
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.group}
                      onChange={e => set('group', e.target.value)}
                    >
                      <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                      {masterGroups.map((group) => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Postal Code', 'அஞ்சல் குறியீடு')}</label>
                    <input
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.postalCode}
                      onChange={e => set('postalCode', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Male Heirs', 'ஆண் வாரிசு')}</label>
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.maleHeirs}
                      onChange={e => set('maleHeirs', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Female Heirs', 'பெண் வாரிசு')}</label>
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.femaleHeirs}
                      onChange={e => set('femaleHeirs', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Cumulative Tax Breakdown */}
              {cumulativeInfo && taxBreakdown.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-yellow-900 mb-3">
                    📊 {L('Outstanding Balance Calculation', 'நிலுவை கணக்கீடு')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-yellow-800 mb-2">{L('Year-wise Breakdown:', 'ஆண்டு வாரியாக:')}</h4>
                      <div className="space-y-1">
                        {taxBreakdown.map((item: any) => (
                          <div key={item.year} className="flex justify-between text-xs">
                            <span className={`${item.status.includes('current') ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                              {item.year} {
                                item.status === 'new_registration_previous_year' ? L('(NEW - Previous Year)', '(புதியது - முந்தைய ஆண்டு)') :
                                item.status === 'registered' ? L('(Registered)', '(பதிவு செய்யப்பட்டது)') : 
                                item.status === 'current_new' ? L('(NEW - Current)', '(புதியது - தற்போதைய)') : 
                                item.status === 'current_registered' ? L('(Current - Registered)', '(தற்போதைய - பதிவு)') :
                                L('(Not Paid)', '(செலுத்தப்படவில்லை)')
                              }:
                            </span>
                            <span className={`font-medium ${item.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ₹{item.outstanding.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-yellow-800 mb-2">{L('Summary:', 'சுருக்கம்:')}</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>{L('Previous Years Outstanding:', 'முந்தைய ஆண்டுகளின் நிலுவை:')}</span>
                          <span className="font-medium text-red-600">₹{cumulativeInfo.cumulativeOutstanding.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{L('Current Year', 'தற்போதைய ஆண்டு')} ({form.year}):</span>
                          <span className="font-medium text-blue-600">₹{cumulativeInfo.currentYearTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-1 font-bold">
                          <span>{L('Total Due:', 'மொத்த நிலுவை:')}</span>
                          <span className="text-green-600">₹{cumulativeInfo.totalTaxDue.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {cumulativeInfo.hasExistingRegistration ? (
                    <p className="text-xs text-yellow-700 mt-2">
                      ⚠️ {L('Existing user: Only actual unpaid amounts from registered years included.', 'ஏற்கனவே பதிவு செய்தவர்: பதிவு செய்யப்பட்ட ஆண்டுகளில் செலுத்தாத தொகைகள் மட்டும் சேர்க்கப்பட்டுள்ளது.')}
                    </p>
                  ) : (
                    <p className="text-xs text-green-700 mt-2">
                      🆕 {L('NEW Registration: Previous years included based on Tax Settings (ON/OFF mode).', 'புதிய பதிவு: வரி அமைப்பின் அடிப்படையில் (ON/OFF) முந்தைய ஆண்டுகள் சேர்க்கப்பட்டுள்ளது.')}
                    </p>
                  )}
                </div>
              )}

              {/* Heirs Section - Compact Table */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {L('Heirs Details', 'வாரிசு விவரம்')}
                  </h3>
                  <button
                    type="button"
                    onClick={addHeir}
                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    + {L('Add', 'சேர்க்க')}
                  </button>
                </div>

                {newUser.heirs && newUser.heirs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300 rounded text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">S.No</th>
                          <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{L('Name', 'பெயர்')}</th>
                          <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{L('Race', 'இனம்')}</th>
                          <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{L('Status', 'நிலை')}</th>
                          <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{L('Education', 'கல்வி')}</th>
                          <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{L('DOB', 'பிறந்த தேதி')}</th>
                          <th className="px-2 py-1 text-center font-medium text-gray-900 border-b">{L('Action', 'நடவடிக்கை')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {newUser.heirs.map((heir, index) => (
                          <tr key={heir.id} className="hover:bg-gray-50">
                            <td className="px-2 py-1 text-center border-b">{heir.serialNumber}</td>
                            <td className="px-2 py-1 border-b">
                              <input
                                type="text"
                                value={heir.name}
                                onChange={(e) => updateHeir(heir.id, 'name', e.target.value)}
                                className={`w-full px-1 py-0.5 text-xs border rounded ${errors[`heir_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                                  }`}
                              />
                            </td>
                            <td className="px-2 py-1 border-b">
                              <select
                                value={heir.race}
                                onChange={(e) => updateHeir(heir.id, 'race', e.target.value)}
                                className={`w-full px-1 py-0.5 text-xs border rounded ${errors[`heir_${index}_race`] ? 'border-red-300' : 'border-gray-300'
                                  }`}
                              >
                                <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                                {masterRaces.map((race) => (
                                  <option key={race.value} value={race.value}>
                                    {race.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1 border-b">
                              <select
                                value={heir.maritalStatus}
                                onChange={(e) => updateHeir(heir.id, 'maritalStatus', e.target.value)}
                                className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded"
                              >
                                {maritalStatusOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1 border-b">
                              <select
                                value={heir.education}
                                onChange={(e) => updateHeir(heir.id, 'education', e.target.value)}
                                className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded"
                              >
                                <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                                {masterEducations.map((edu) => (
                                  <option key={edu} value={edu}>{edu}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1 border-b">
                              <input
                                type="date"
                                value={heir.birthDate}
                                onChange={(e) => updateHeir(heir.id, 'birthDate', e.target.value)}
                                className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-2 py-1 border-b text-center">
                              <button
                                onClick={() => removeHeir(heir.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-xs bg-white rounded border border-gray-200">
                    <p>{L('No heirs added', 'வாரிசுகள் இல்லை')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Photo & Action Buttons (1/4 width) */}
            <div className="space-y-4">
              {/* Photo Upload - Compact */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{L('Photo', 'புகைப்படம்')}</h3>
                <div className="flex flex-col items-center">
                  <div className="w-24 h-32 bg-white border-2 border-dashed border-gray-300 rounded flex items-center justify-center mb-2">
                    {newUser.photo ? (
                      <img
                        src={URL.createObjectURL(newUser.photo)}
                        alt="Preview"
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-xs">{L('Photo', 'புகைப்படம்')}</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded cursor-pointer hover:bg-blue-700"
                  >
                    {L('Upload', 'பதிவேற்று')}
                  </label>
                  <p className="text-xs text-gray-500 mt-1 text-center">{L('Max: 100KB', 'அதிகபட்சம்: 100KB')}</p>
                </div>
              </div>

              {/* Action Buttons - Compact */}
              <div className="space-y-2">
                <button
                  disabled={saving}
                  onClick={submit}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {saving ? L('Saving...', 'சேமிக்கிறது...') : L('Save', 'சேமிக்க')}
                </button>

                <button
                  onClick={clearForm}
                  className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded shadow hover:bg-gray-300 text-sm"
                >
                  {L('Clear', 'அழிக்க')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
