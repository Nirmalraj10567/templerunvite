import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import the useTranslation hook
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Modal } from '@/components/ui/modal';
import { useLanguage } from '@/lib/language';
import axios from 'axios';
import { CardHeader, CardTitle } from '@/components/ui/card';

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
  const { language } = useLanguage();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [form, setForm] = useState({
    referenceNumber: '',
    date: today,
    name: '',
    alternativeName: '',
    wifeName: '',
    wifeFatherName: '',
    wifeContact: '',
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
    gender: '',
    maritalStatus: '',
    parentReferenceId: '',
    familyHeadReference: '',
    relationshipType: 'self',
    separateFromFamily: true,
    year: new Date().getFullYear(),
    taxAmount: '',
    amountPaid: '',
    outstandingAmount: '',
    fromAccount: 'TAX A/C',
    transferTo: 'INCOME A/C',
    memberId: '',
  });

  const [newUser, setNewUser] = useState({
    heirs: [] as Heir[],
    photo: null as File | null,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [nameLookingUp, setNameLookingUp] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: number; value: string; label: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [taxBreakdown, setTaxBreakdown] = useState<any[]>([]);
  const [cumulativeInfo, setCumulativeInfo] = useState<any>(null);
  const [initialDue, setInitialDue] = useState<number>(0); // current year tax + previous unpaid, from backend settings
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState<boolean>(false);
  const [nameResults, setNameResults] = useState<any[]>([]);
  const [showNameResults, setShowNameResults] = useState<boolean>(false);
  const [mobileResults, setMobileResults] = useState<any[]>([]);
  const [showMobileResults, setShowMobileResults] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const suppressNameLookupRef = useRef<number>(0);
  const suppressMobileLookupRef = useRef<number>(0);
  // Focus target for fast entry after selection
  const amountPaidRef = useRef<HTMLInputElement>(null);
  // Separate input for searching by receipt number (do not reuse generated referenceNumber)
  const [receiptSearch, setReceiptSearch] = useState<string>('');
  // Existing photo from autofill (when no new upload)
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  // When data is autofilled, lock personal/id/address sections by default
  const [autoLocked, setAutoLocked] = useState<boolean>(false);
  // Collapsible sections to reduce scrolling
  const [showAddress, setShowAddress] = useState<boolean>(false);
  const [showIdDetails, setShowIdDetails] = useState<boolean>(false);
  const [showHeirs, setShowHeirs] = useState<boolean>(false);
  const [showCumulative, setShowCumulative] = useState<boolean>(false);
  const [showPhoto, setShowPhoto] = useState<boolean>(false);

  // Master data for dropdowns
  const [masterClans, setMasterClans] = useState<string[]>([]);
  const [masterGroups, setMasterGroups] = useState<string[]>([]);
  const [masterOccupations, setMasterOccupations] = useState<string[]>([]);
  const [masterEducations, setMasterEducations] = useState<string[]>([]);

  // Subdivision removed

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
            fetch(`http://localhost:4000/api/master/clans/${user.templeId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`http://localhost:4000/api/master/groups/${user.templeId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`http://localhost:4000/api/master/occupations/${user.templeId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`http://localhost:4000/api/master/educations/${user.templeId}`, {
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
        const resp =await axios.get<any>('http://localhost:4000/api/ledger/categories', {
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

  // Load tax amount and next Ref No for current year on mount
  useEffect(() => {
    if (user?.templeId && token && !loading) {
      fetchTaxAmountForYear(form.year);
      fetchNextReferenceNumber(form.year);
    }
  }, [user?.templeId, token, loading]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  // Helper to show text in current language only
  const L = (en: string, ta: string) => (language === 'english' ? ta : en);

  // Helper function to intelligently determine when to show dropdown
  const shouldShowDropdown = (results: any[], searchType: 'mobile' | 'name') => {
    if (!results || results.length === 0) {
      return false; // No matches - don't show dropdown
    }
    
    if (results.length === 1) {
      // Single match - auto-fill and don't show dropdown
      return false;
    }
    
    // 2+ matches - show dropdown for user to choose
    return true;
  };

  // Helper function to show success messages in modal
  const showSuccessAlert = (message: string) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
    // Auto-close after 4 seconds
    setTimeout(() => {
      setShowSuccessModal(false);
      setSuccessMessage('');
    }, 4000);
  };

  // Input formatting functions
  const formatMobileNumber = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 10);
    if (clean.length >= 6) return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    if (clean.length >= 3) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    return clean;
  };

  // Derived remaining due after payment
  const remainingDue = Math.max(
    0,
    Number(form.outstandingAmount || 0) - Number(form.amountPaid || 0)
  );

  // Debounced auto-lookup for Name and Mobile (replaces search buttons)
  useEffect(() => {
    // Suppress lookup shortly after a selection to avoid reopening dropdown
    if (suppressNameLookupRef.current && Date.now() < suppressNameLookupRef.current) return;
    const q = form.name?.trim() || '';
    if (!q || q.length < 2) return;
    const t = setTimeout(() => {
      try {
        (lookupUsersByName as any)?.(q);
      } catch (e) {
        // no-op if function not present
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form.name]);

  useEffect(() => {
    const digits = form.mobileNumber?.replace(/\D/g, '') || '';
    if (digits.length !== 10) return;
    const t = setTimeout(() => {
      try {
        (lookupUserByMobile as any)?.(form.mobileNumber);
      } catch (e) {}
    }, 300);
    return () => clearTimeout(t);
  }, [form.mobileNumber]);

  // Manual search only - no auto-lookup for reference number

  // Auto-fill: default Amount to be paid from Outstanding (or Tax Amount) if empty
  useEffect(() => {
    const due = Number(form.outstandingAmount || form.taxAmount || 0);
    if ((!form.amountPaid || Number(form.amountPaid) <= 0) && Number.isFinite(due) && due > 0) {
      setForm(prev => ({ ...prev, amountPaid: String(due) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.outstandingAmount, form.taxAmount]);

  // Fast navigation: treat Enter as Tab to move to next field
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter') return;
    const t = e.target as HTMLElement;
    const tag = t.tagName?.toLowerCase();
    if (!tag || ['button'].includes(tag)) return; // allow buttons to click
    e.preventDefault();
    const selectors = 'input, select, textarea, button';
    const tabbables = Array.from(document.querySelectorAll<HTMLElement>(selectors))
      .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.offsetParent !== null);
    const idx = tabbables.indexOf(t);
    if (idx > -1 && idx + 1 < tabbables.length) {
      tabbables[idx + 1].focus();
    }
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (nameInputRef.current && !nameInputRef.current.contains(target)) {
        setShowNameResults(false);
      }
      if (mobileInputRef.current && !mobileInputRef.current.contains(target)) {
        setShowMobileResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch next yearly reference number (read-only Ref No)
  const fetchNextReferenceNumber = async (year: number) => {
    if (!token || !year) return;
    try {
      const res = await fetch(`http://localhost:4000/api/tax-registrations/next-ref?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.ref) {
          setForm(prev => ({ ...prev, referenceNumber: data.ref }));
        }
      }
    } catch (e) {
      console.error('Failed to fetch next reference number', e);
    }
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

  // Helper: fill form fields from a registration row
  const fillFormFromRegistration = (userData: any) => {
    setForm(prev => ({
      ...prev,
      name: userData.name || '',
      alternativeName: userData.alternative_name || '',
      wifeName: userData.wife_name || '',
      wifeFatherName: userData.wife_father_name || '',
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
      gender: userData.gender || '',
      maritalStatus: userData.marital_status || '',
      parentReferenceId: userData.parent_reference_id || '',
      familyHeadReference: userData.family_head_reference || '',
      relationshipType: userData.relationship_type || 'self',
      mobileNumber: userData.mobile_number ? formatMobileNumber(userData.mobile_number) : prev.mobileNumber,
      memberId: userData.reference_number ? userData.reference_number.toString() : '',
    }));
    // Enable lock after autofill
    setAutoLocked(true);
    // Try to capture existing photo URL from various possible keys
    const resolveImageUrl = (raw?: string | null) => {
      if (!raw) return null;
      // helper: backend base (dev: force :4000 for local hosts irrespective of FE port)
      const getBackendBase = () => {
        const { origin } = window.location;
        try {
          const url = new URL(origin);
          const host = url.hostname;
          const isLocal = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host);
          if (isLocal) {
            return `${url.protocol}//${host}:4000`;
          }
        } catch {}
        return origin; // same-origin in prod or if parsing fails
      };
      // Absolute URL
      if (/^https?:\/\//i.test(raw)) return raw;
      const path = raw.startsWith('/public/') ? raw : (raw.startsWith('/uploads/') ? `/public${raw}` : null);
      if (!path) return null;
      return `${getBackendBase()}${path}`;
    };
    const img = resolveImageUrl(
      userData.photo_path || userData.photoUrl || userData.image_path || userData.photo || userData.image
    );
    setExistingPhotoUrl(img || null);
  };


  // Mobile number lookup function
  const lookupUserByMobile = async (mobileNumber: string) => {
    const cleanMobile = mobileNumber.replace(/\D/g, '');
    console.log('Looking up mobile:', cleanMobile); // Debug log

    if (cleanMobile.length < 3) {
      setMobileResults([]);
      setShowMobileResults(false);
      return;
    }

    // Suppress lookup shortly after a selection to avoid reopening dropdown
    if (suppressMobileLookupRef.current && Date.now() < suppressMobileLookupRef.current) {
      console.log('Lookup suppressed'); // Debug log
      return;
    }

    setLookingUp(true);
    setErr(null);

    try {
      console.log('Fetching results for mobile:', cleanMobile); // Debug log
      // Search in user_registrations table for existing user data using the search parameter
      const response = await fetch(`http://localhost:4000/api/registrations?search=${cleanMobile}&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Mobile search results:', data); // Debug log
        const rows = (data?.data && Array.isArray(data.data)) ? data.data : [];
        setMobileResults(rows);
        
        // Use intelligent dropdown logic
        const shouldShow = shouldShowDropdown(rows, 'mobile');
        setShowMobileResults(shouldShow);
        
        if (rows.length === 0) {
          setMsg(L('No matches found', 'பொருந்தும் பதிவுகள் இல்லை'));
          setTimeout(() => setMsg(null), 3000);
        } else if (rows.length === 1) {
          // Auto-fill single match
          const userData = rows[0];
          fillFormFromRegistration(userData);
          const mobile = userData?.mobile_number ? formatMobileNumber(userData.mobile_number) : '';
          if (mobile && user?.templeId && token) {
            fetchCumulativeTax(mobile, form.year);
          }
          showSuccessAlert(`✅ Auto-filled: ${userData.name} - Registration ID ${userData.id}`);
        }
      }
    } catch (error) {
      console.error('Error looking up user:', error);
      // Don't show error for lookup failure, just continue with manual entry
    } finally {
      setLookingUp(false);
    }
  };

  // Name lookup: search registrations by name (or partial)
  const lookupUsersByName = async (query: string) => {
    const q = (query || '').trim();
    if (!q || q.length < 2 || !token) {
      setNameResults([]);
      setShowNameResults(false);
      return;
    }

    setNameLookingUp(true);
    setErr(null);
    try {
      const response = await fetch(`http://localhost:4000/api/registrations?search=${encodeURIComponent(q)}&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const rows = (data?.data && Array.isArray(data.data)) ? data.data : [];
        setNameResults(rows);
        
        // Use intelligent dropdown logic
        const shouldShow = shouldShowDropdown(rows, 'name');
        setShowNameResults(shouldShow);
        
        if (rows.length === 0) {
          setMsg(L('No matches found', 'பொருந்தும் பதிவுகள் இல்லை'));
          setTimeout(() => setMsg(null), 3000);
        } else if (rows.length === 1) {
          // Auto-fill single match
          const userData = rows[0];
          fillFormFromRegistration(userData);
          const mobile = userData?.mobile_number ? formatMobileNumber(userData.mobile_number) : '';
          if (mobile && user?.templeId && token) {
            fetchCumulativeTax(mobile, form.year);
          }
          showSuccessAlert(`✅ Auto-filled: ${userData.name} - Registration ID ${userData.id}`);
        }
      }
    } catch (error) {
      console.error('Error looking up by name:', error);
    } finally {
      setNameLookingUp(false);
    }
  };

  // Receipt number lookup function
  const lookupByReceiptNumber = async (receiptNumber: string) => {
    const cleanReceipt = (receiptNumber || '').trim();
    console.log('Looking up receipt:', cleanReceipt);

    if (cleanReceipt.length < 3) {
      setErr(L('Receipt number too short', 'ரசீது எண் மிகவும் குறுகியது'));
      return;
    }

    setLookingUp(true);
    setErr(null);
    setMsg(null);

    try {
      console.log('Fetching results for receipt:', cleanReceipt);
      // Search in user_registrations table for existing user data using reference number
      const response = await fetch(`http://localhost:4000/api/registrations?search=${encodeURIComponent(cleanReceipt)}&pageSize=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Receipt search results:', data);
        const rows = (data?.data && Array.isArray(data.data)) ? data.data : [];
        
        if (rows.length > 0) {
          // Auto-fill the first matching result
          const userData = rows[0];
          fillFormFromRegistration(userData);
          showSuccessAlert(`✅ Found: ${userData.name} - Reference ${userData.reference_number} (Member ID: ${userData.id || 'N/A'})`);
        } else {
          setErr(L('No user registration found with this reference number', 'இந்த குறிப்பு எண்ணுடன் பயனர் பதிவு இல்லை'));
        }
      } else {
        setErr(L('Failed to search reference number', 'குறிப்பு எண்ணைத் தேட முடியவில்லை'));
      }
    } catch (error) {
      console.error('Error looking up receipt:', error);
      setErr(L('Error searching reference number', 'குறிப்பு எண்ணைத் தேடுவதில் பிழை'));
    } finally {
      setLookingUp(false);
    }
  };

  // Family reference lookup - for married man to find father's tax record
  const lookupFamilyByReference = async (refNumber: string) => {
    const cleanRef = (refNumber || '').trim();
    if (!cleanRef || cleanRef.length < 3) {
      setErr(L('Reference number too short', 'குறிப்பு எண் மிகவும் குறுகியது'));
      return;
    }

    setLookingUp(true);
    setErr(null);
    setMsg(null);

    try {
      // Search in user_tax_registrations table by reference number
      const response = await fetch(`http://localhost:4000/api/tax-registrations/by-reference/${encodeURIComponent(cleanRef)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const familyData = data.data;
          // Auto-fill family details from father's record
          setForm(prev => ({
            ...prev,
            address: familyData.address || prev.address,
            village: familyData.village || prev.village,
            fatherName: familyData.name || prev.fatherName, // Father's name as this person's father
            mobileNumber: familyData.mobile_number ? formatMobileNumber(familyData.mobile_number) : prev.mobileNumber,
            clan: familyData.clan || prev.clan,
            group: familyData.group || prev.group,
            postalCode: familyData.postal_code || prev.postalCode,
            parentReferenceId: cleanRef,
          }));
          showSuccessAlert(`✅ Linked to Family: ${familyData.name} - ${cleanRef} / குடும்பத்துடன் இணைக்கப்பட்டது: ${familyData.name}`);
        } else {
          setErr(L('No tax registration found with this reference', 'இந்த குறிப்பு எண்ணுடன் வரி பதிவு இல்லை'));
        }
      } else {
        setErr(L('Failed to search family reference', 'குடும்ப குறிப்பு எண்ணைத் தேட முடியவில்லை'));
      }
    } catch (error) {
      console.error('Error looking up family reference:', error);
      setErr(L('Error searching family reference', 'குடும்ப குறிப்பு எண்ணைத் தேடுவதில் பிழை'));
    } finally {
      setLookingUp(false);
    }
  };

  const handleSelectRegistration = (userData: any) => {
    fillFormFromRegistration(userData);
    // If mobile found, also fetch cumulative tax
    const mobile = userData?.mobile_number ? formatMobileNumber(userData.mobile_number) : '';
    if (mobile && user?.templeId && token) {
      fetchCumulativeTax(mobile, form.year);
    }
    showSuccessAlert(`✅ Selected: ${userData.name} - Registration ID ${userData.id}`);
    setShowNameResults(false);
    setNameResults([]);
    // Briefly suppress auto-lookup to prevent dropdown from reopening
    suppressNameLookupRef.current = Date.now() + 800;
    // Blur name input to close any native suggestions and move on
    if (nameInputRef.current) nameInputRef.current.blur();
    // Move focus to Amount to be paid for quick collection entry
    setTimeout(() => {
      if (amountPaidRef.current) {
        amountPaidRef.current.focus();
        amountPaidRef.current.select();
      }
    }, 0);
  };

  // Handle mobile number change with lookup and cumulative calculation
  const handleMobileChange = (value: string) => {
    console.log('Mobile value changed:', value); // Debug log
    const formatted = formatMobileNumber(value);
    setForm(prev => ({ ...prev, mobileNumber: formatted }));
    if (errors.mobileNumber) setErrors(prev => ({ ...prev, mobileNumber: '' }));

    // Trigger lookup after 3 digits with debounce
    const cleanMobile = value.replace(/\D/g, '');
    console.log('Clean mobile:', cleanMobile, 'length:', cleanMobile.length); // Debug log

    if (cleanMobile.length >= 3 && user?.templeId && token) {
      console.log('Will trigger lookup'); // Debug log
      lookupUserByMobile(formatted);
    } else {
      console.log('Clearing results'); // Debug log
      setMobileResults([]);
      setShowMobileResults(false);
    }
  };

  // Handle selection from mobile suggestions
  const handleSelectMobile = (userData: any) => {
    fillFormFromRegistration(userData);
    const mobile = userData?.mobile_number ? formatMobileNumber(userData.mobile_number) : '';
    if (mobile && user?.templeId && token) {
      fetchCumulativeTax(mobile, form.year);
    }
    showSuccessAlert(`✅ Selected: ${userData.name} - Registration ID ${userData.id}`);
    setShowMobileResults(false);
    setMobileResults([]);
    // Briefly suppress auto-lookup to prevent dropdown from reopening
    suppressMobileLookupRef.current = Date.now() + 800;
    // Blur mobile input to close any native suggestions and move on
    if (mobileInputRef.current) mobileInputRef.current.blur();
    // Move focus to Amount to be paid for quick collection entry
    setTimeout(() => {
      if (amountPaidRef.current) {
        amountPaidRef.current.focus();
        amountPaidRef.current.select();
      }
    }, 0);
  };

  // Fetch cumulative tax calculation for mobile number
  const fetchCumulativeTax = async (mobileNumber: string, year: number) => {
    if (!token || !mobileNumber || !year) return;

    const cleanMobile = mobileNumber.replace(/\D/g, '');
    if (cleanMobile.length !== 10) return;

    try {
      const response = await fetch(`http://localhost:4000/api/tax-calculations/cumulative/${cleanMobile}?currentYear=${year}`, {
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
            showSuccessAlert(`🆕 NEW Registration: Total ₹${totalTaxDue} (Previous Years: ₹${cumulativeOutstanding}, ${form.year}: ₹${currentYearTax}) | ${breakdownMsg}`);
          } else if (cumulativeOutstanding > 0) {
            showSuccessAlert(`📊 Existing User Outstanding: ₹${totalTaxDue} (Previous: ₹${cumulativeOutstanding}, Current: ₹${currentYearTax})`);
          } else {
            showSuccessAlert(`✅ Current year tax: ₹${currentYearTax} (No previous outstanding)`);
          }
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
      const response = await fetch(`http://localhost:4000/api/tax-settings/year/${year}`, {
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
          showSuccessAlert(`Tax amount for ${year}: ₹${data.data.tax_amount} loaded / ${year} வரி தொகை: ₹${data.data.tax_amount} ஏற்றப்பட்டது`);
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
    // Update reference number for the selected year
    fetchNextReferenceNumber(year);
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
      // Once user selects a new photo, ignore existing URL preview
      if (existingPhotoUrl) setExistingPhotoUrl(null);
      setErr(null);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.referenceNumber || !form.referenceNumber.trim()) {
      newErrors.referenceNumber = 'Ref No not generated yet / குறிப்பு எண் இல்லை';
    }

    if (!form.year || isNaN(Number(form.year))) {
      newErrors.year = 'Year is required / வருடம் அவசியம்';
    }

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

    // Transfer and amounts (transferTo is set by default and hidden)
    const paid = Number(form.amountPaid);
    if (!form.amountPaid || isNaN(paid) || paid <= 0) {
      newErrors.amountPaid = 'Enter a valid amount to be paid (> 0) / செலுத்தும் தொகையை சரியாக உள்ளிடவும்';
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
      formData.append('name', form.name);
      formData.append('alternativeName', form.alternativeName);
      formData.append('wifeName', form.wifeName);
      formData.append('wifeFatherName', form.wifeFatherName);
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
      formData.append('gender', form.gender);
      formData.append('maritalStatus', form.maritalStatus);
      formData.append('parentReferenceId', form.parentReferenceId);
      formData.append('familyHeadReference', form.familyHeadReference);
      formData.append('relationshipType', form.relationshipType);
      formData.append('separateFromFamily', String(form.separateFromFamily));
      formData.append('year', form.year.toString());
      formData.append('taxAmount', form.taxAmount);
      formData.append('amountPaid', form.amountPaid);
      // Send remaining due as outstandingAmount
      formData.append('outstandingAmount', String(remainingDue));
      formData.append('fromAccount', (form as any).fromAccount || 'TAX A/C');
      formData.append('transferTo', (form as any).transferTo || 'INCOME A/C');
      formData.append('templeId', user.templeId.toString());
      // Add member_id field - this should be populated when user is found via lookup
      formData.append('memberId', (form as any).memberId || '');

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

      const res = await fetch('http://localhost:4000/api/tax-registrations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (e) {
        // ignore parse errors
      }
      if (!res.ok) {
        const message = data?.error || data?.message || `Failed to save (${res.status})`;
        throw new Error(message);
      }

      showSuccessAlert(`Tax registration ID ${data.id} saved successfully / வரி பதிவு ID ${data.id} வெற்றிகரமாக சேமிக்கப்பட்டது`);
      if (typeof data?.id === 'number') {
        setLastCreatedId(data.id);
        setShowPrintPrompt(true);
      }

      // Reset form
      setForm({
        referenceNumber: '',
        date: today,
        name: '',
        alternativeName: '',
        wifeName: '',
        wifeFatherName: '',
        wifeContact: '',
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
        gender: '',
        maritalStatus: '',
        parentReferenceId: '',
        familyHeadReference: '',
        relationshipType: 'self',
        separateFromFamily: true,
        year: new Date().getFullYear(),
        taxAmount: '',
        amountPaid: '',
        outstandingAmount: '',
        fromAccount: 'TAX A/C',
        transferTo: 'INCOME A/C',
        memberId: '',
      });

      setNewUser({
        heirs: [],
        photo: null,
      });
      setExistingPhotoUrl(null);
      // Prepare next reference number for the next entry
      fetchNextReferenceNumber(new Date().getFullYear());

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
      name: '',
      alternativeName: '',
      wifeName: '',
      wifeFatherName: '',
      wifeContact: '',
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
      gender: '',
      maritalStatus: '',
      parentReferenceId: '',
      familyHeadReference: '',
      relationshipType: 'self',
      separateFromFamily: true,
      year: currentYear,
      taxAmount: '',
      amountPaid: '',
      outstandingAmount: '',
      fromAccount: 'TAX A/C',
      transferTo: 'INCOME A/C',
      memberId: '',
    });
    // Fetch tax amount for current year after clearing
    fetchTaxAmountForYear(currentYear);
    fetchNextReferenceNumber(currentYear);
    setNewUser({
      heirs: [],
      photo: null,
    });
    setExistingPhotoUrl(null);
    setAutoLocked(false);
    setErrors({});
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
    <div className="min-h-screen bg-gray-50 py-0.5 px-3">
      <div className="max-w-7xl mx-auto">
        {/* Language Toggle + Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-center flex-1">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6 rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-center">
              {L('Tax Registration', 'வரி பதிவு')}
         </CardTitle>
</CardHeader>
          </div>
     
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2" onKeyDown={handleFormKeyDown}>
          {/* Error Messages Only - Success messages now use modal */}
          {err && (
            <div className="mb-3">
              <Alert variant="destructive">
                <AlertTitle>Error / பிழை</AlertTitle>
                <AlertDescription>{err}</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
            {/* Left Column - Main Form Fields (3/4 width) */}
            <div className="lg:col-span-3 space-y-2">
              {/* Basic Info Section */}
              <div className="bg-gray-50 rounded-lg p-1.5">
                <div className="flex items-center justify-between mb-2">
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Date', 'தேதி')}</label>
                    <input
                      type="date"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.date}
                      onChange={e => set('date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Year', 'வருடம்')} *</label>
                    <select
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.year}
                      onChange={e => handleYearChange(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Reference No (auto)', 'குறிப்பு எண் (தானாக)')}</label>
                    <input
                      className={`w-full px-2 py-1 text-sm border rounded bg-gray-100 cursor-not-allowed ${errors.referenceNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      value={form.referenceNumber}
                      readOnly
                      title={L('Auto-generated when year changes', 'வருடம் மாற்றும் போது தானாக உருவாகும்')}
                    />
                    {errors.referenceNumber && <p className="text-red-500 text-xs mt-1">{errors.referenceNumber}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">
                      {L('Reference No Search', 'குறிப்பு எண் தேடல்')}
                      {lookingUp && <span className="ml-2 text-blue-600 text-xs">🔍 {L('Searching...', 'தேடுகிறது...')}</span>}
                    </label>
                    <div className="flex gap-1">
                      <input
                        className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300"
                        value={receiptSearch}
                        onChange={e => setReceiptSearch(e.target.value)}
                        placeholder={L('Enter reference number to search', 'குறிப்பு எண்ணைத் தட்டச்சு செய்து தேடு')}
                        title={L('Enter reference number to auto-fill details', 'குறிப்பு எண்ணை உள்ளிட்டு விவரங்களை தானாக நிரப்பு')}
                      />
                      <button
                        type="button"
                        onClick={() => lookupByReceiptNumber(receiptSearch)}
                        disabled={!receiptSearch.trim() || lookingUp}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={L('Search by reference number', 'குறிப்பு எண்ணால் தேடு')}
                      >
                        🔍
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      💡 {L('Search with an existing reference number to auto-fill details', 'இருந்த குறிப்பு எண்ணை உள்ளிட்டு விவரங்களை தானாக நிரப்பு')}
                    </p>
                  </div>
                  
                </div>
              </div>
              {/* Gender & Marital Status */}
              <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">{L('Personal Status', 'தனிப்பட்ட நிலை')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Gender', 'பாலினம்')} *</label>
                    <select
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.gender ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      value={form.gender}
                      onChange={e => set('gender', e.target.value)}
                    >
                      <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                      <option value="male">{L('Male', 'ஆண்')}</option>
                      <option value="female">{L('Female', 'பெண்')}</option>
                      <option value="other">{L('Other', 'மற்றவை')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Marital Status', 'திருமண நிலை')} *</label>
                    <select
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.maritalStatus ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                      value={form.maritalStatus}
                      onChange={e => set('maritalStatus', e.target.value)}
                    >
                      <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                      <option value="unmarried">{L('Unmarried', 'திருமணமாகாத')}</option>
                      <option value="married">{L('Married', 'திருமணமான')}</option>
                      <option value="divorced">{L('Divorced', 'விவாகரத்து')}</option>
                      <option value="widowed">{L('Widowed', 'விதவை/விதவன்')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Family Reference Search - Show only for Married + Male */}
              {form.maritalStatus === 'married' && form.gender === 'male' && (
                <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-200">
                  <h3 className="text-sm font-semibold text-amber-900 mb-2">{L('Family Reference (Father/Husband)', 'குடும்ப குறிப்பு எண் (தந்தை/கணவர்)')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">
                        {L('Search Father\'s Tax Ref', 'தந்தையின் வரி குறிப்பு எண் தேடு')}
                      </label>
                      <div className="flex gap-1">
                        <input
                          className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent border-gray-300"
                          value={form.parentReferenceId}
                          onChange={e => set('parentReferenceId', e.target.value)}
                          placeholder={L('Enter father\'s reference', 'தந்தையின் குறிப்பு எண்ணை உள்ளிடவும்')}
                        />
                        <button
                          type="button"
                          onClick={() => lookupFamilyByReference(form.parentReferenceId)}
                          disabled={!form.parentReferenceId.trim() || lookingUp}
                          className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 disabled:opacity-50"
                        >
                          🔍
                        </button>
                      </div>
                    </div>
                    {form.parentReferenceId && (
                      <div className="md:col-span-2 flex items-center">
                        <div className="bg-white px-3 py-1.5 rounded border border-amber-300 text-xs">
                          <span className="text-amber-700 font-medium">{L('Linked to Family:', 'குடும்பத்துடன் இணைக்கப்பட்டது:')}</span>
                          <span className="ml-1 text-gray-700">{form.parentReferenceId}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    💡 {L('Enter father\'s tax reference to auto-fill family details (address, village, etc.)', 'குடும்ப விவரங்களை தானாக நிரப்ப தந்தையின் வரி குறிப்பு எண்ணை உள்ளிடவும்')}
                  </p>
                </div>
              )}

              {/* Personal Details */}
              <div className="bg-gray-50 rounded-lg p-1.5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">{L('Personal Details', 'தனிப்பட்ட விவரங்கள்')}</h3>
                  <button
                    type="button"
                    onClick={() => setAutoLocked(v => !v)}
                    className={`text-xs px-2 py-0.5 rounded border ${autoLocked ? 'text-orange-700 border-orange-300 bg-orange-50' : 'text-gray-600 border-gray-300 bg-white'}`}
                    title={autoLocked ? L('Unlock to edit autofilled fields', 'தானாக நிரப்பப்பட்டவற்றை திருத்த திறக்க') : L('Lock autofilled fields', 'தானாக நிரப்பப்பட்டவற்றை பூட்டு')}
                  >
                    {autoLocked ? L('Locked', 'பூட்டப்பட்டது') : L('Unlock', 'திற')}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">
                      {L('Mobile Number', 'கைபேசி எண்')} *
                      {lookingUp && <span className="ml-2 text-blue-600 text-xs">🔍 {L('Looking up...', 'தேடுகிறது...')}</span>}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        ref={mobileInputRef}
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.mobileNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                        value={form.mobileNumber}
                        onChange={e => {
                          handleMobileChange(e.target.value);
                          // Clear dropdown when user starts typing
                          if (showMobileResults) {
                            setShowMobileResults(false);
                          }
                        }}
                        placeholder={L('Enter mobile number to search', 'கைபேசி எண்ணைத் தட்டச்சு செய்து தேடு')}
                        maxLength={12}
                        autoComplete="off"
                      />
                      {/* Debug info */}
                      {lookingUp && <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-blue-600">🔍</div>}
                      
                      {/* Suggestions dropdown */}
                      {showMobileResults && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-56 overflow-auto">
                          {mobileResults.length > 0 ? (
                            mobileResults.map((row: any) => (
                              <button
                                key={row.id}
                                type="button"
                                onClick={() => handleSelectMobile(row)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{row.name}</span>
                                  <span className="text-xs text-gray-500">#{row.id}</span>
                                </div>
                                <div className="text-xs text-gray-600 mt-0.5">
                                  {(row.mobile_number ? `📱 ${formatMobileNumber(row.mobile_number)} · ` : '')}
                                  {(row.village ? `${row.village}` : '')}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {L('No matches found', 'பொருந்தும் பதிவுகள் இல்லை')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber}</p>}
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-900 mb-1">
                      {L('Name', 'பெயர்')} *
                      {nameLookingUp && <span className="ml-2 text-blue-600 text-xs">🔍 {L('Searching...', 'தேடுகிறது...')}</span>}
                    </label>
                    <div>
                      <input
                        className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                        value={form.name}
                        onChange={e => {
                          set('name', e.target.value);
                          // Clear dropdown when user starts typing
                          if (showNameResults) {
                            setShowNameResults(false);
                          }
                        }}
                        placeholder={L('Type a name to search', 'பெயரைத் தட்டச்சு செய்து தேடு')}
                        ref={nameInputRef}
                      />
                    </div>
                    {showNameResults && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-56 overflow-auto text-sm">
                        {nameResults.length > 0 ? (
                          nameResults.map((row: any) => (
                            <button
                              key={row.id}
                              type="button"
                              onClick={() => handleSelectRegistration(row)}
                              className="w-full text-left px-2 py-1 hover:bg-gray-50 border-b last:border-b-0"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{row.name}</span>
                                <span className="text-xs text-gray-500">#{row.id}</span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {(row.mobile_number ? `📱 ${formatMobileNumber(row.mobile_number)} · ` : '')}
                                {(row.village ? `${row.village}` : '')}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            {L('No matches found', 'பொருந்தும் பதிவுகள் இல்லை')}
                          </div>
                        )}
                      </div>
                    )}
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">
                      {L('Last Name', 'கடைசி பெயர்')}
                    </label>
                    <input
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.alternativeName}
                      onChange={e => set('alternativeName', e.target.value)}
                    />
                  </div>
                  
                  {/* Wife Details - Only for Married + Male */}
                  {form.maritalStatus === 'married' && form.gender === 'male' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">{L('Wife\'s Name', 'மனைவி பெயர்')}</label>
                        <input
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          value={form.wifeName}
                          onChange={e => set('wifeName', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">{L('Wife\'s Father Name', 'மனைவி தந்தை பெயர்')}</label>
                        <input
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          value={form.wifeFatherName}
                          onChange={e => set('wifeFatherName', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">{L('Wife Contact', 'மனைவி தொடர்பு')}</label>
                        <input
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                          value={form.wifeContact}
                          onChange={e => set('wifeContact', e.target.value)}
                          placeholder={L('Mobile/Phone', 'கைபேசி/தொலைபேசி')}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.separateFromFamily}
                            onChange={e => set('separateFromFamily', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-gray-900">
                            {L('Create Separate Tax ID (New Family Branch)', 'தனி வரி ID உருவாக்கு (புதிய குடும்ப கிளை)')}
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-5">
                          {L('If unchecked, this will be linked to existing family record', 'தேர்ந்தெடுக்காவிட்டால், இது இருக்கும் குடும்ப பதிவுடன் இணைக்கப்படும்')}
                        </p>
                      </div>
                    </>
                  )}
                  {/* Begin locked fields */}
                  <fieldset disabled={autoLocked} className="contents">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Alt Name', 'மாற்று பெயர்')}</label>
                    <input
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.alternativeName}
                      onChange={e => set('alternativeName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Spouse', 'மனைவி')}</label>
                    <input
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.wifeName}
                      onChange={e => set('wifeName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Father', 'தந்தை')} *</label>
                    <input
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.fatherName ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.birthDate}
                      onChange={e => set('birthDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Education', 'கல்வி')}</label>
                    <select
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
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
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Village', 'கிராமம்')}</label>
                    <input
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.village}
                      onChange={e => set('village', e.target.value)}
                    />
                  </div>
                  </fieldset>
                  {/* End locked fields */}
                </div>
              </div>
              

           

              {/* Address (collapsible) */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{L('Address', 'முகவரி')} *</h3>
                  <button type="button" className="text-xs text-blue-600" onClick={() => setShowAddress(v => !v)}>
                    {showAddress ? L('Hide', 'மறை') : L('Show', 'காட்டு')}
                  </button>
                </div>
                {showAddress && (
                  <fieldset disabled={autoLocked} className="contents">
                    <textarea
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.address ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                      rows={2}
                      value={form.address}
                      onChange={e => set('address', e.target.value)}
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  </fieldset>
                )}
              </div>

              {/* ID Numbers & Other Info (collapsible) */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">{L('ID & Other Details', 'அடையாள விவரங்கள்')}</h3>
                  <button type="button" className="text-xs text-blue-600" onClick={() => setShowIdDetails(v => !v)}>
                    {showIdDetails ? L('Hide', 'மறை') : L('Show', 'காட்டு')}
                  </button>
                </div>
                {showIdDetails && (
                  <fieldset disabled={autoLocked} className="contents">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Aadhaar', 'ஆதார்')}</label>
                    <input
                      type="text"
                      className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.aadhaarNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.panNumber}
                      onChange={e => set('panNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Clan', 'குலம்')}</label>
                    <select
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
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
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.postalCode}
                      onChange={e => set('postalCode', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Male Heirs', 'ஆண் வாரிசு')}</label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.maleHeirs}
                      onChange={e => set('maleHeirs', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Female Heirs', 'பெண் வாரிசு')}</label>
                    <input
                      type="number"
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      value={form.femaleHeirs}
                      onChange={e => set('femaleHeirs', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </div>
                </fieldset>
                )}
              </div>
              {/* Cumulative Tax Breakdown (collapsible) */}
              {cumulativeInfo && taxBreakdown.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-yellow-900">
                      📊 {L('Outstanding Balance Calculation', 'நிலுவை கணக்கீடு')}
                    </h3>
                    <button type="button" className="text-xs text-blue-700" onClick={() => setShowCumulative(v => !v)}>
                      {showCumulative ? L('Hide', 'மறை') : L('Show', 'காட்டு')}
                    </button>
                  </div>
                  {showCumulative && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs font-medium text-yellow-800 mb-2">{L('Year-wise Breakdown:', 'ஆண்டு வாரியாக:')}</h4>
                          <div className="space-y-1">
                            {taxBreakdown.map((item: any) => (
                              <div key={item.year} className="flex justify-between text-xs">
                                <span className={`${item.status.includes('current') ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                                  {item.year}{' '}
                                  {
                                    item.status === 'new_registration_previous_year' ? L('(NEW - Previous Year)', '(புதியது - முந்தைய ஆண்டு)') :
                                    item.status === 'registered' ? L('(Registered)', '(பதிவு செய்யப்பட்டது)') : 
                                    item.status === 'current_new' ? L('(NEW - Current)', '(புதியது - தற்போதைய)') : 
                                    item.status === 'current_registered' ? L('(Current - Registered)', '(தற்போதைய - பதிவு)') :
                                    L('(Not Paid)', '(செலுத்தப்படவில்லை)')
                                  }
                                  {':'}
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
                    </>
                  )}
                </div>
              )}

              {/* Heirs Section - Compact Table (collapsible) */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {L('Heirs Details', 'வாரிசு விவரம்')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs text-blue-600"
                      onClick={() => setShowHeirs(v => !v)}
                    >
                      {showHeirs ? L('Hide', 'மறை') : L('Show', 'காட்டு')}
                    </button>
                    <button
                      type="button"
                      onClick={addHeir}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      + {L('Add', 'சேர்க்க')}
                    </button>
                  </div>
                </div>
                {showHeirs && newUser.heirs && newUser.heirs.length > 0 ? (
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
                  showHeirs && (
                    <div className="text-center py-4 text-gray-500 text-xs bg-white rounded border border-gray-200">
                      <p>{L('No heirs added', 'வாரிசுகள் இல்லை')}</p>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Right Column - Photo, Amounts & Actions (1/4 width) */}
            <div className="space-y-2">
              {/* Photo Upload - Toggleable */}
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-gray-900">{L('Photo', 'புகைப்படம்')}</h3>
                  <button type="button" className="text-xs text-blue-600" onClick={() => setShowPhoto(v => !v)}>
                    {showPhoto ? L('Hide', 'மறை') : L('Show', 'காட்டு')}
                  </button>
                </div>
                {showPhoto && (
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-28 bg-white border-2 border-dashed border-gray-300 rounded flex items-center justify-center mb-2">
                      {(!newUser.photo && existingPhotoUrl) ? (
                        <img src={existingPhotoUrl} alt="Profile" className="w-full h-full object-cover rounded" />
                      ) : newUser.photo ? (
                        <img src={URL.createObjectURL(newUser.photo)} alt="Preview" className="w-full h-full object-cover rounded" />
                      ) : (
                        <div className="text-center text-gray-500">
                          <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-xs">{L('Photo', 'புகைப்படம்')}</p>
                        </div>
                      )}
                    </div>
                
                  </div>
                )}
              </div>

              {/* Transfer To Account - hidden (default set to INCOME A/C) */}
              {false && (
              <div className="bg-gray-50 rounded-lg p-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{L('Transfer To Account', 'எந்த கணக்கிற்கு மாற்றுவது')}</h3>
                <label htmlFor="transfer-to" className="block text-xs font-medium text-gray-900 mb-1">
                  {L('Account', 'கணக்கு')} <span className="text-red-600">*</span>
                </label>
                <select
                  id="transfer-to"
                  required
                  className={`w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent ${errors.transferTo ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                  value={(form as any).transferTo || ''}
                  onChange={e => set('transferTo' as any, e.target.value)}
                >
                  <option value="">{L('Select', 'தேர்ந்தெடு')}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {errors.transferTo && (
                  <p className="text-red-500 text-xs mt-1">{errors.transferTo}</p>
                )}
              </div>
              )}

              {/* Amounts Summary */}
              <div className="bg-gray-50 rounded-lg p-2">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{L('Amounts', 'தொகைகள்')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Amount', 'தொகை')}</label>
                    <input
                      readOnly
                      value={form.taxAmount}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Amount due', 'நிறுவை தொகை')}</label>
                    <input
                      readOnly
                      value={remainingDue.toString()}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Amount to be paid', 'செலுத்தும் தொகை')}</label>
                    <input
                      type="number"
                      value={form.amountPaid}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={e => handleAmountPaidChange(e.target.value)}
                      ref={amountPaidRef}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{L('Remaining due', 'மீதமுள்ள நிலுவை')}</label>
                    <input
                      readOnly
                      value={remainingDue.toString()}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100"
                    />
                  </div>
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
        {showPrintPrompt && lastCreatedId != null && (
          <Modal
            title={L('Print Receipt', 'ரசீதை அச்சிடவா?')}
            onClose={() => setShowPrintPrompt(false)}
          >
            <p className="mb-4 text-sm">
              {L('Do you want to open the PDF receipt for printing?', 'PDF ரசீதை அச்சிட திறக்க விரும்புகிறீர்களா?')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded border"
                onClick={() => setShowPrintPrompt(false)}
              >
                {L('No', 'இல்லை')}
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  const t = token ? encodeURIComponent(token) : '';
                  const url = `http://localhost:4000/api/tax-registrations/${lastCreatedId}/receipt.pdf${t ? `?token=${t}` : ''}`;
                  window.open(url, '_blank');
                  setShowPrintPrompt(false);
                }}
              >
                {L('Yes, Print', 'ஆம், அச்சிடு')}
              </button>
            </div>
          </Modal>
        )}

        {/* Success Alert Modal */}
        {showSuccessModal && (
          <Modal
            title={L('Success', 'வெற்றி')}
            onClose={() => setShowSuccessModal(false)}
          >
            <div className="text-center">
              <div className="text-green-600 text-4xl mb-4">✅</div>
              <p className="text-sm text-gray-700 mb-4">
                {successMessage}
              </p>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={() => setShowSuccessModal(false)}
              >
                {L('OK', 'சரி')}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </div>
  </div>
);
}
