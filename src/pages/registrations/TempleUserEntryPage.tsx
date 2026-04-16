import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { theme } from '@/styles/theme';
import { cn } from '@/lib/utils';

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
    english: {
      pageTitle: 'காணியாளர்கள் வரி பதிவு',
      pageSubtitle: 'காணியாளர்கள் வரி பதிவு',
      generalInfo: 'பொது தகவல்',
      clearForm: 'அழிக்க',
      clearFormTitle: 'அனைத்தையும் அழி',
      landownerFinancials: 'காணியாளர் விவரங்கள் & நிதி',
      personalHeirDetails: 'தனிப்பட்ட & வாரிசு விவரங்கள்',
      outstandingAmount: 'நிலுவை தொகை',
      heirsTitle: 'வாரிசுதாரர்கள் (குடும்ப விவரங்கள்)',
      addHeir: '+ வாரிசு சேர்',
      exit: 'வெளியேறு',
      register: 'பதிவு',
      save: 'சேமிக்க',
      saving: 'சேமிக்கிறது...',
      lookingUp: 'தேடுகிறது...',
      autofillHint: 'கைபேசியை உள்ளிட்டவுடன் பதிவுகளில் இருந்து விவரங்கள் தானாக நிரப்படும்',
      receiptNumber: 'ரசீது எண்',
      date: 'தேதி',
      landownerNo: 'காணியாளர் எண்',
      mobileNumber: 'கைபேசி எண்',
      name: 'பெயர்',
      alternativeName: 'கடைசி பெயர்',
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
        marriage: 'திருமணம் நிலை',
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
      success: {
        saved: 'வெற்றிகரமாக சேமிக்கப்பட்டது',
        updated: 'புதுப்பிக்கப்பட்டது',
      },
      errors: {
        general: 'சேமிக்க முடியவில்லை',
        required: 'அவசியம்',
      },
    },
    tamil: {
      pageTitle: 'Landowners User Registration',
      pageSubtitle: '',
      generalInfo: 'General Info',
      clearForm: 'Clear',
      clearFormTitle: 'Clear all fields',
      landownerFinancials: 'Landowner Details & Financials',
      personalHeirDetails: 'Personal & Heir Details',
      outstandingAmount: 'Outstanding Amount',
      heirsTitle: 'Heirs/Family Details',
      addHeir: '+ Add Heir',
      exit: 'Exit',
      register: 'Register',
      save: 'Save',
      saving: 'Saving...',
      lookingUp: 'Looking up...',
      autofillHint: 'Auto-fills details from existing registrations when mobile is entered',
      receiptNumber: 'Receipt Number',
      date: 'Date',
      landownerNo: 'Landowner No.',
      mobileNumber: 'Mobile Number',
      name: 'Name',
      alternativeName: 'Last Name',
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
      clan: 'Kootttam',
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
      selectClan: 'Select Kootttam',
      selectGroup: 'Select Group',
      heirsTable: {
        sno: 'S.No.',
        name: 'Name',
        race: 'Race/Community',
        marriage: 'Marriage status',
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
      success: {
        saved: 'Saved successfully',
        updated: 'Updated successfully',
      },
      errors: {
        general: 'Failed to save',
        required: 'Required',
      },
    },
  } as const;

  // UI feature flags
  const enablePhotoUpload = true;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [newUser, setNewUser] = useState({
    receiptNumber: '',
    date: today,
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
    // Family chain fields
    parentReferenceId: '',
    familyHeadReference: '',
    relationshipType: 'self',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

  // Removed print-related state

  // Master data
  const [masterClans, setMasterClans] = useState<string[]>([]);
  const [masterGroups, setMasterGroups] = useState<string[]>([]);
  const [masterOccupations, setMasterOccupations] = useState<string[]>([]);
  const [masterEducations, setMasterEducations] = useState<string[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; value: string; label: string }>>([]);

  // Collapsible sections
  const [showAddress, setShowAddress] = useState<boolean>(false);
  const [showIdDetails, setShowIdDetails] = useState<boolean>(false);
  const [showHeirs, setShowHeirs] = useState<boolean>(false);
  const [showPhoto, setShowPhoto] = useState<boolean>(true);

  useEffect(() => {
    if (user?.templeId && token) {
      (async () => {
        try {
          const [clansRes, groupsRes, occupationsRes, educationsRes] = await Promise.all([
            fetch(`http://localhost:4000/api/master/clans/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`http://localhost:4000/api/master/groups/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`http://localhost:4000/api/master/occupations/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`http://localhost:4000/api/master/educations/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          if (clansRes.ok) {
            const clans = (await clansRes.json()).map((x: any) => x.name);
            setMasterClans(clans);
          }
          if (groupsRes.ok) setMasterGroups((await groupsRes.json()).map((x: any) => x.name));
          if (occupationsRes.ok) setMasterOccupations((await occupationsRes.json()).map((x: any) => x.name));
          if (educationsRes.ok) {
            setMasterEducations((await educationsRes.json()).map((x: any) => x.name));
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
          setErr(language === 'tamil' ? 'முதன்மை தரவு ஏற்ற முடியவில்லை' : 'Failed to load master data');
        }
      })();
    }
  }, [user, token, language]);

  // Load ledger categories
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const resp = await fetch('http://localhost:4000/api/ledger/categories', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await resp.json();
        const mapped = (Array.isArray(data) ? data : []).map((item: any, index: number) => {
          if (typeof item === 'string') return { id: index + 1, value: item, label: item };
          return { id: item.id || index + 1, value: item.value || item.label, label: item.label || item.value };
        });
        setCategories(mapped);
      } catch (e) {
        console.error('Failed to load ledger categories', e);
      }
    })();
  }, [token]);

  // Load existing registration for edit mode
  useEffect(() => {
    const loadForEdit = async () => {
      if (!editId || !token) return;
      try {
        const res = await fetch(`http://localhost:4000/api/registrations/${editId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load registration');
        const r = data.data;
        setNewUser((prev) => ({
          ...prev,
          receiptNumber: r.reference_number || '',
          date: r.date || today,
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
        // Debug: Log the photo path
        console.log('Photo path from API:', r.photo_path);
        const baseUrl = 'http://localhost:4000/public';
        const photoUrl = r.photo_path ? 
          (r.photo_path.startsWith('http') ? r.photo_path : `${baseUrl}${r.photo_path.startsWith('/') ? '' : '/'}${r.photo_path}`) : 
          null;
        console.log('Constructed photo URL:', photoUrl);
        
        // Test if the photo URL is accessible
        if (photoUrl) {
          fetch(photoUrl, { method: 'HEAD' })
            .then(response => {
              if (response.ok) {
                console.log('Photo URL is accessible:', photoUrl);
                setExistingPhotoUrl(photoUrl);
              } else {
                console.warn('Photo URL not accessible:', photoUrl, 'Status:', response.status);
                setExistingPhotoUrl(null);
              }
            })
            .catch(error => {
              console.error('Error checking photo URL:', photoUrl, error);
              setExistingPhotoUrl(null);
            });
        } else {
          setExistingPhotoUrl(null);
        }
      } catch (e) {
        console.error('Failed to load registration for edit', e);
      }
    };
    loadForEdit();
  }, [editId, token, today]);

  // Helper Function: Format Mobile Number
  // This is a basic formatter. It strips all non-digits and then limits to 10 digits.
  // You can enhance it to add spaces or dashes (e.g., "123 456 7890") if desired.
  const formatMobileNumber = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.slice(0, 10);
  };

  // Helper Function: Format Aadhaar Number
  // Formats as XXXX-XXXX-XXXX as the user types.
  const formatAadhaarNumber = (value: string): string => {
    const digitsOnly = value.replace(/\D/g, '');
    if (digitsOnly.length <= 4) {
      return digitsOnly;
    } else if (digitsOnly.length <= 8) {
      return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
    } else {
      return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 8)}-${digitsOnly.slice(8, 12)}`;
    }
  };

  // Helper Function: Handle Field Change
  // A generic handler for most input fields.
  const handleFieldChange = (field: keyof typeof newUser, value: string | number) => {
    setNewUser((prev) => ({ ...prev, [field]: value }));
  };

  // Family reference lookup - search for father's tax record
  const lookupFamilyByReference = async (refNumber: string) => {
    const cleanRef = (refNumber || '').trim();
    if (!cleanRef || cleanRef.length < 3) {
      setErr(language === 'tamil' ? 'குறிப்பு எண் மிகக் குறைவாக உள்ளது' : 'Reference number too short');
      return;
    }
    setLookingUp(true);
    setErr(null);
    try {
      const res = await fetch(`http://localhost:4000/api/tax-registrations/by-reference/${encodeURIComponent(cleanRef)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const familyData = data.data;
          
          // VERIFICATION: Check if new person's name exists in family heirs list
          const userName = newUser.name?.toLowerCase().trim() || '';
          const userFatherName = newUser.fatherName?.toLowerCase().trim() || '';
          const familyHeadName = familyData.name?.toLowerCase().trim() || '';
          
          // For now, check if father name matches family head (simple verification)
          // Full heirs list check requires another API call
          const fatherMatches = userFatherName && familyHeadName && 
            (userFatherName === familyHeadName || 
             userFatherName.includes(familyHeadName) || 
             familyHeadName.includes(userFatherName));
          
          // Also check if user's last name matches family's last name
          const userLastName = newUser.name?.split(' ').pop()?.toLowerCase() || '';
          const familyLastName = familyData.name?.split(' ').pop()?.toLowerCase() || '';
          const nameMatches = userLastName === familyLastName;
          
          // If verification fails, show warning but allow override
          if (!fatherMatches && !nameMatches && userName) {
            const confirmLink = window.confirm(
              language === 'tamil' 
                ? `⚠️ எச்சரிக்கை: ${familyData.name} குடும்பத்துடன் பொருந்தவில்லை\\n\\n` +
                  `உங்கள் பெயர்: ${newUser.name}\\n` +
                  `தந்தை பெயர்: ${newUser.fatherName || '-'}\\n` +
                  `குடும்ப தலைவர்: ${familyData.name}\\n\\n` +
                  `இந்த குடும்பத்தில் "${newUser.name}" பதிவு செய்யப்பட்ட வாரிசா?\\n` +
                  `இருப்பினும் இணைக்க வேண்டுமா?`
                : `⚠️ WARNING: Details don't match with ${familyData.name} family\\n\\n` +
                  `Your Name: ${newUser.name}\\n` +
                  `Father Name: ${newUser.fatherName || '-'}\\n` +
                  `Family Head: ${familyData.name}\\n\\n` +
                  `Is "${newUser.name}" registered as a heir in this family?\\n` +
                  `Still want to link?`
            );
            if (!confirmLink) {
              setLookingUp(false);
              return;
            }
          }
          
          // Auto-fill father's name and other family details
          setNewUser(prev => ({
            ...prev,
            fatherName: familyData.name || prev.fatherName,
            clan: familyData.clan || prev.clan,
            group: familyData.group || prev.group,
            parentReferenceId: cleanRef,
            familyHeadReference: familyData.family_head_reference || familyData.reference_number || cleanRef,
          }));
          setMsg(language === 'tamil' 
            ? `✅ குடும்பத்துடன் இணைக்கப்பட்டது: ${familyData.name}` 
            : `✅ Linked to Family: ${familyData.name}`);
        } else {
          setErr(language === 'tamil' ? 'இந்த குறிப்பு எண்ணுடன் வரி பதிவு இல்லை' : 'No tax registration found with this reference');
        }
      } else if (res.status === 403) {
        setErr(language === 'tamil' ? 'வரி பதிவுகளை பார்க்க அனுமதி இல்லை' : 'No permission to view tax registrations');
      } else if (res.status === 404) {
        setErr(language === 'tamil' ? 'இந்த குறிப்பு எண்ணுடன் வரி பதிவு இல்லை' : 'No tax registration found with this reference');
      } else {
        setErr(language === 'tamil' ? 'குடும்ப குறிப்பு எண்ணைத் தேட முடியவில்லை' : 'Failed to search family reference');
      }
    } catch (error) {
      console.error('Error looking up family reference:', error);
      setErr(language === 'tamil' ? 'குடும்ப குறிப்பு எண்ணைத் தேடுவதில் பிழை' : 'Error searching family reference');
    } finally {
      setLookingUp(false);
    }
  };

  // Helper Function: Validate Form
  // Performs basic validation. You should expand this based on your requirements.
  const validateForm = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    const errRequired = t[language as 'tamil' | 'english'].errors.required;

    if (!newUser.date) newErrors.date = errRequired;
    if (!newUser.mobileNumber) newErrors.mobileNumber = errRequired;
    else if (newUser.mobileNumber.length !== 10 || !/^\d{10}$/.test(newUser.mobileNumber)) {
      newErrors.mobileNumber = language === 'tamil' ? '10 இலக்க கைபேசி எண் தேவை' : 'Enter valid 10-digit mobile number';
    }
    if (!newUser.name) newErrors.name = errRequired;
    if (!newUser.fatherName) newErrors.fatherName = errRequired;
    if (!newUser.education) newErrors.education = errRequired;
    if (!newUser.occupation) newErrors.occupation = errRequired;
    if (!newUser.address) newErrors.address = errRequired;

    // Validate education is from master list
    if (newUser.education && masterEducations.length > 0 && !masterEducations.includes(newUser.education)) {
      newErrors.education = language === 'tamil' ? 'படிப்பைத் தேர்வு செய்க' : 'Select from list';
    }
    // Validate occupation is from master list
    if (newUser.occupation && masterOccupations.length > 0 && !masterOccupations.includes(newUser.occupation)) {
      newErrors.occupation = language === 'tamil' ? 'தொழிலைத் தேர்வு செய்க' : 'Select from list';
    }

    // Validate heirs if the section is visible or if there are heirs
    if (newUser.heirs && newUser.heirs.length > 0) {
      newUser.heirs.forEach((heir, index) => {
        if (!heir.name) {
          newErrors[`heir_${index}_name`] = t[language as 'tamil' | 'english'].errors.required;
        }
        if (!heir.race) {
          newErrors[`heir_${index}_race`] = t[language as 'tamil' | 'english'].errors.required;
        }
      });
    }

    setErrors(newErrors);
    return newErrors;
  };

  // Helper Function: Clear Form
  // This resets the form and also clears any messages.
  const clearForm = () => {
    setNewUser({
      receiptNumber: '',
      date: today,
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
      parentReferenceId: '',
      familyHeadReference: '',
      relationshipType: 'self',
      photo: null,
      heirs: [],
    });
    setErrors({});
    setErr(null);
    setMsg(null);
    setExistingPhotoUrl(null);
    // Optionally, you could call `fetchNextRef()` here if you want to pre-fill a new ref number.
  };

  // Helper Function: Fetch Next Reference Number
  // This is a placeholder. You need to implement the actual API call.
  const fetchNextRef = async () => {
    if (!token || !user?.templeId) return;
    try {
      const res = await fetch(`http://localhost:4000/api/registrations/next-reference?templeId=${user.templeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setNewUser((prev) => ({ ...prev, receiptNumber: data.nextReference || '' }));
      }
    } catch (error) {
      console.error('Failed to fetch next reference number', error);
    }
  };

  // Handle mobile with simple formatting; lookup can be added later if needed
  const handleMobileChange = (value: string) => {
    const formatted = formatMobileNumber(value);
    setNewUser((prev) => ({ ...prev, mobileNumber: formatted }));
    if (errors.mobileNumber) setErrors((prev) => ({ ...prev, mobileNumber: '' }));
  };

  // Generic formatted input helper
  const handleFormattedInput = (
    field: keyof typeof newUser,
    value: string,
    formatter: (v: string) => string,
  ) => {
    const formatted = formatter(value);
    setNewUser((prev) => ({ ...prev, [field]: formatted }));
    if (errors[field as string]) setErrors((prev) => ({ ...prev, [field as string]: '' }));
  };

  // Heirs handlers
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

  const updateHeir = (id: number, field: keyof Heir, value: any) => {
    setNewUser((prev) => ({
      ...prev,
      heirs: prev.heirs.map((h) => (h.id === id ? { ...h, [field]: value } : h)),
    }));
  };

  const removeHeir = (id: number) => {
    setNewUser((prev) => ({
      ...prev,
      heirs: prev.heirs
        .filter((h) => h.id !== id)
        .map((heir, index) => ({ ...heir, serialNumber: index + 1 })),
    }));
  };

  // Photo handler (1MB+ limit, backend will compress)
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Allow up to 5MB, backend will compress
    if (file.size > 5 * 1024 * 1024) {
      setErr(language === 'tamil' ? 'புகைப்படம் 5MB-க்கும் குறைவாக இருக்க வேண்டும்' : 'Photo size must be less than 5MB');
      return;
    }
    
    // Check if it's a valid image file
    if (!file.type.startsWith('image/')) {
      setErr(language === 'tamil' ? 'புகைப்படம் மட்டுமே அனுமதிக்கப்படுகிறது' : 'Only image files are allowed');
      return;
    }
    
    setNewUser((prev) => ({ ...prev, photo: file }));
    if (existingPhotoUrl) setExistingPhotoUrl(null);
    if (err) setErr(null);
  };

  // Effect to automatically clear success message after 3 seconds
  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => {
        setMsg(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  // Save handler: POST on create, PUT on edit
  const handleAddUser = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      const errorFields = Object.keys(validationErrors).join(', ');
      setErr((language === 'tamil' ? 'தவறான புலங்கள்: ' : 'Invalid fields: ') + errorFields);
      return;
    }
    setIsSubmitting(true);
    setErr(null);
    setMsg(null);
    try {
      const isEdit = !!editId;
      const url = isEdit ? `http://localhost:4000/api/registrations/${editId}` : 'http://localhost:4000/api/registrations';
      const method = isEdit ? 'PUT' : 'POST';
      
      // Check if we have a photo to upload
      if (newUser.photo) {
        console.log('Photo detected, using FormData for upload:', newUser.photo.name, newUser.photo.size);
        // Use FormData for photo upload
        const formData = new FormData();
        formData.append('photo', newUser.photo);
        formData.append('referenceNumber', newUser.receiptNumber);
        formData.append('date', newUser.date);
        formData.append('name', newUser.name);
        formData.append('alternativeName', newUser.alternativeName);
        formData.append('wifeName', newUser.wifeName);
        formData.append('education', newUser.education);
        formData.append('occupation', newUser.occupation);
        formData.append('fatherName', newUser.fatherName);
        formData.append('address', newUser.address);
        formData.append('birthDate', '');
        formData.append('village', '');
        formData.append('mobileNumber', newUser.mobileNumber);
        formData.append('aadhaarNumber', newUser.aadhaarNumber);
        formData.append('panNumber', '');
        formData.append('clan', newUser.clan);
        formData.append('group', newUser.group);
        formData.append('postalCode', newUser.postalCode);
        formData.append('maleHeirs', newUser.maleHeirs.toString());
        formData.append('femaleHeirs', newUser.femaleHeirs.toString());
        formData.append('heirs', JSON.stringify(newUser.heirs.map(h => ({
          serialNumber: h.serialNumber,
          name: h.name,
          race: h.race,
          maritalStatus: h.maritalStatus,
          education: h.education,
          birthDate: h.birthDate,
        }))));
        // Family chain fields
        formData.append('parentReferenceId', newUser.parentReferenceId);
        formData.append('familyHeadReference', newUser.familyHeadReference);
        formData.append('relationshipType', newUser.relationshipType);
        
        const res = await fetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed');
        
        if (!isEdit) {
          const ref = data?.reference_number as string | undefined;
          setMsg(t[language as 'tamil' | 'english'].success.saved);
          if (ref) {
            // If backend sent a ref, we can briefly show it in message; form will reset anyway
          }
          resetFormFieldsWithoutClearingMessage();
        } else {
          setMsg(t[language as 'tamil' | 'english'].success.updated);
        }
      } else {
        // No photo, use JSON for regular data
        const body = {
          referenceNumber: newUser.receiptNumber, // backend will override/generate
          date: newUser.date,
          name: newUser.name,
          alternativeName: newUser.alternativeName,
          wifeName: newUser.wifeName,
          education: newUser.education,
          occupation: newUser.occupation,
          fatherName: newUser.fatherName,
          address: newUser.address,
          birthDate: '',
          village: '',
          mobileNumber: newUser.mobileNumber,
          aadhaarNumber: newUser.aadhaarNumber,
          panNumber: '',
          clan: newUser.clan,
          group: newUser.group,
          postalCode: newUser.postalCode,
          maleHeirs: newUser.maleHeirs,
          femaleHeirs: newUser.femaleHeirs,
          heirs: newUser.heirs.map(h => ({
            serialNumber: h.serialNumber,
            name: h.name,
            race: h.race,
            maritalStatus: h.maritalStatus,
            education: h.education,
            birthDate: h.birthDate,
          })),
          // Family chain fields
          parentReferenceId: newUser.parentReferenceId,
          familyHeadReference: newUser.familyHeadReference,
          relationshipType: newUser.relationshipType,
        };
        
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed');
        
        if (!isEdit) {
          const ref = data?.reference_number as string | undefined;
          setMsg(t[language as 'tamil' | 'english'].success.saved);
          if (ref) {
            // If backend sent a ref, we can briefly show it in message; form will reset anyway
          }
          resetFormFieldsWithoutClearingMessage();
        } else {
          setMsg(t[language as 'tamil' | 'english'].success.updated);
        }
      }
    } catch (e: any) {
      setErr(e?.message || t[language as 'tamil' | 'english'].errors.general);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset only the form fields but KEEP any success message intact.
  const resetFormFieldsWithoutClearingMessage = () => {
    setNewUser({
      receiptNumber: '',
      date: today,
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
      parentReferenceId: '',
      familyHeadReference: '',
      relationshipType: 'self',
      outstandingAmount: '',
      photo: null,
      heirs: [],
    });
    setErrors({});
    setErr(null);
    setExistingPhotoUrl(null);
    // Prefill next reference number from backend after clearing
    (async () => { try { await fetchNextRef(); } catch {} })();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full width header */}
      <div className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-6 px-6">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold text-center">
            {t[language as 'tamil' | 'english'].pageTitle}
          </h1>
        </div>
      </div>
      
      <div className="container mx-auto p-4">
      {/* Main Container */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2">
        {/* Status Messages */}
        {(msg || err) && (
          <div className="mb-3">
            <Alert
              variant={err ? 'destructive' : 'default'}
              className={err ? '' : 'border-green-500 bg-green-50 text-green-700'}
            >
              <AlertTitle className={err ? '' : 'text-green-800 font-semibold'}>
                {err ? 'Error / பிழை' : 'Success / வெற்றி'}
              </AlertTitle>
              <AlertDescription className={err ? '' : 'text-green-700'}>
                {err ? err : msg}
              </AlertDescription>
            </Alert>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Column - Form Fields (3/4 width) */}
          <div className="lg:col-span-3 space-y-3">
            {/* General Info */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{t[language as 'tamil' | 'english'].generalInfo}</h3>
                <button
                  type="button"
                  onClick={clearForm}
                  className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                  title={t[language as 'tamil' | 'english'].clearFormTitle}
                >
                  🗑️ {t[language as 'tamil' | 'english'].clearForm}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {/* Receipt number field removed as per requirement */}
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">
                    {t[language as 'tamil' | 'english'].date} *
                  </label>
                  <input
                    type="date"
                    className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded", errors.date && "border-red-500 bg-red-50")}
                    value={newUser.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    required
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">
                    {t[language as 'tamil' | 'english'].year}
                  </label>
                  <input
                    className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded")}
                    value={newUser.year}
                    onChange={(e) => handleFieldChange('year', e.target.value)}
                  />
                </div>
              </div>
            </div>
            {/* Personal Details */}
            <div className="bg-gray-50 rounded-lg p-1.5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{t[language as 'tamil' | 'english'].landownerFinancials}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">
                    {t[language as 'tamil' | 'english'].mobileNumber} *
                    {lookingUp && <span className="ml-2 text-blue-600 text-xs">🔍 {t[language as 'tamil' | 'english'].lookingUp}</span>}
                  </label>
                  <div>
                    <input
                      type="tel"
                      className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded", errors.mobileNumber && "border-red-500 bg-red-50")}
                      value={newUser.mobileNumber}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      placeholder={t[language as 'tamil' | 'english'].placeholderMobile}
                      maxLength={12}
                      required
                    />
                  </div>
                  {errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{errors.mobileNumber}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    💡 {t[language as 'tamil' | 'english'].autofillHint}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">
                    {t[language as 'tamil' | 'english'].name} *
                  </label>
                  <input
                    type="text"
                    className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded", errors.name && "border-red-500 bg-red-50")}
                    value={newUser.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    required
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].alternativeName}</label>
                  <input
                    className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded")}
                    value={newUser.alternativeName}
                    onChange={(e) => handleFieldChange('alternativeName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].wifeName}</label>
                  <input
                    className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded")}
                    value={newUser.wifeName}
                    onChange={(e) => handleFieldChange('wifeName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">
                    {t[language as 'tamil' | 'english'].fatherName} *
                  </label>
                  <div className="flex gap-1">
                    <input
                      className={cn(theme.input.base, "flex-1 px-2 py-1 text-sm rounded", errors.fatherName && "border-red-500 bg-red-50")}
                      value={newUser.fatherName}
                      onChange={(e) => handleFieldChange('fatherName', e.target.value)}
                      placeholder={language === 'tamil' ? 'தந்தையின் பெயர்' : "Father's Name"}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => lookupFamilyByReference(newUser.parentReferenceId || newUser.fatherName)}
                      disabled={lookingUp}
                      className="px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 disabled:opacity-50"
                      title={language === 'tamil' ? 'குடும்ப குறிப்பு எண் மூலம் தேடு' : 'Search by Family Reference'}
                    >
                      {lookingUp ? '...' : '🔍'}
                    </button>
                  </div>
                  {errors.fatherName && <p className="text-red-500 text-xs mt-1">{errors.fatherName}</p>}
                  
                  {/* Family Reference Input */}
                  <div className="mt-1 flex gap-1">
                    <input
                      className="flex-1 px-2 py-1 text-xs border border-amber-300 rounded focus:ring-1 focus:ring-amber-500"
                      value={newUser.parentReferenceId}
                      onChange={(e) => handleFieldChange('parentReferenceId', e.target.value)}
                      placeholder={language === 'tamil' ? 'குடும்ப குறிப்பு எண் (T-2024-XXX)' : 'Family Reference (T-2024-XXX)'}
                    />
                  </div>
                  
                  {newUser.parentReferenceId && (
                    <div className="mt-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      {language === 'tamil' ? 'குடும்பத்துடன் இணைக்கப்பட்டது:' : 'Linked to Family:'} {newUser.parentReferenceId}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].educationLabel} *</label>
                  <select
                    className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded", errors.education && "border-red-500 bg-red-50")}
                    value={newUser.education}
                    onChange={(e) => handleFieldChange('education', e.target.value)}
                    required
                  >
                    <option value="">{t[language as 'tamil' | 'english'].selectEducation}</option>
                    {masterEducations.map((edu) => (
                      <option key={edu} value={edu}>{edu}</option>
                    ))}
                  </select>
                  {errors.education && <p className="text-red-500 text-xs mt-1">{errors.education}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].occupationLabel} *</label>
                  <select
                    className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded", errors.occupation && "border-red-500 bg-red-50")}
                    value={newUser.occupation}
                    onChange={(e) => handleFieldChange('occupation', e.target.value)}
                    required
                  >
                    <option value="">{t[language as 'tamil' | 'english'].selectOccupation}</option>
                    {masterOccupations.map((occ) => (
                      <option key={occ} value={occ}>{occ}</option>
                    ))}
                  </select>
                  {errors.occupation && <p className="text-red-500 text-xs mt-1">{errors.occupation}</p>}
                </div>
              </div>
            </div>
            {/* Address (collapsible) */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{t[language as 'tamil' | 'english'].address} *</h3>
                <button type="button" className="text-xs text-blue-600" onClick={() => setShowAddress(v => !v)}>
                  {showAddress ? t[language as 'tamil' | 'english'].clearForm : t[language as 'tamil' | 'english'].register}
                </button>
              </div>
              {showAddress && (
                <textarea
                  className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded", errors.address && "border-red-500 bg-red-50")}
                  rows={2}
                  value={newUser.address}
                  onChange={(e) => handleFieldChange('address', e.target.value)}
                  placeholder={t[language as 'tamil' | 'english'].placeholderAddress}
                  required
                />
              )}
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>
            {/* ID Numbers & Other Info (collapsible) */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{t[language as 'tamil' | 'english'].personalHeirDetails}</h3>
                <button type="button" className="text-xs text-blue-600" onClick={() => setShowIdDetails(v => !v)}>
                  {showIdDetails ? t[language as 'tamil' | 'english'].clearForm : t[language as 'tamil' | 'english'].register}
                </button>
              </div>
              {showIdDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].aadhaarNumber}</label>
                    <input
                      type="text"
                      className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded")}
                      value={newUser.aadhaarNumber}
                      onChange={(e) => handleFormattedInput('aadhaarNumber', e.target.value, formatAadhaarNumber)}
                      placeholder={t[language as 'tamil' | 'english'].placeholderAadhaar}
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].clan}</label>
                    <select
                      className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded")}
                      value={newUser.clan}
                      onChange={(e) => handleFieldChange('clan', e.target.value)}
                    >
                      <option value="">{t[language as 'tamil' | 'english'].selectClan}</option>
                      {masterClans.map((clan) => (
                        <option key={clan} value={clan}>{clan}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].group}</label>
                    <select
                      className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded")}
                      value={newUser.group}
                      onChange={(e) => handleFieldChange('group', e.target.value)}
                    >
                      <option value="">{t[language as 'tamil' | 'english'].selectGroup}</option>
                      {masterGroups.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].postalCode}</label>
                    <input
                      className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded")}
                      value={newUser.postalCode}
                      onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                      placeholder={t[language as 'tamil' | 'english'].placeholderPostal}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].maleHeirs}</label>
                    <input
                      type="number"
                      className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded")}
                      value={newUser.maleHeirs}
                      onChange={(e) => handleFieldChange('maleHeirs', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">{t[language as 'tamil' | 'english'].femaleHeirs}</label>
                    <input
                      type="number"
                      className={cn(theme.input.base, "w-full px-2 py-1 text-sm rounded")}
                      value={newUser.femaleHeirs}
                      onChange={(e) => handleFieldChange('femaleHeirs', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Heirs Section - Compact Table (collapsible) */}
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  {t[language as 'tamil' | 'english'].heirsTitle}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs text-blue-600"
                    onClick={() => setShowHeirs(v => !v)}
                  >
                    {showHeirs ? t[language as 'tamil' | 'english'].clearForm : t[language as 'tamil' | 'english'].register}
                  </button>
                  <button
                    type="button"
                    onClick={addHeir}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    {t[language as 'tamil' | 'english'].addHeir}
                  </button>
                </div>
              </div>
              {showHeirs && newUser.heirs && newUser.heirs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300 rounded text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{t[language as 'tamil' | 'english'].heirsTable.sno}</th>
                        <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{t[language as 'tamil' | 'english'].heirsTable.name}</th>
                        <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{t[language as 'tamil' | 'english'].heirsTable.race}</th>
                        <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{t[language as 'tamil' | 'english'].heirsTable.marriage}</th>
                        <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{t[language as 'tamil' | 'english'].heirsTable.education}</th>
                        <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">{t[language as 'tamil' | 'english'].heirsTable.bdate}</th>
                        <th className="px-2 py-1 text-center font-medium text-gray-900 border-b">{t[language as 'tamil' | 'english'].heirsTable.action}</th>
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
                              className={`w-full px-1 py-0.5 text-xs border rounded ${errors[`heir_${index}_name`] ? 'border-red-300' : 'border-gray-300'}`}
                              placeholder={t[language as 'tamil' | 'english'].placeholderHeirName}
                            />
                            {errors[`heir_${index}_name`] && <p className="text-red-500 text-xs mt-1">{errors[`heir_${index}_name`]}</p>}
                          </td>
                          <td className="px-2 py-1 border-b">
                            <select
                              value={heir.race}
                              onChange={(e) => updateHeir(heir.id, 'race', e.target.value)}
                              className={`w-full px-1 py-0.5 text-xs border rounded ${errors[`heir_${index}_race`] ? 'border-red-300' : 'border-gray-300'}`}
                            >
                              <option value="">{t[language as 'tamil' | 'english'].selectRace}</option>
                              {masterClans.map((race) => (
                                <option key={race} value={race}>
                                  {race}
                                </option>
                              ))}
                            </select>
                            {errors[`heir_${index}_race`] && <p className="text-red-500 text-xs mt-1">{errors[`heir_${index}_race`]}</p>}
                          </td>
                          <td className="px-2 py-1 border-b">
                            <select
                              value={heir.maritalStatus}
                              onChange={(e) => updateHeir(heir.id, 'maritalStatus', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded"
                            >
                              <option value="unmarried">{t[language as 'tamil' | 'english'].heirsTable.maritalStatus.unmarried}</option>
                              <option value="married">{t[language as 'tamil' | 'english'].heirsTable.maritalStatus.married}</option>
                              <option value="divorced">{t[language as 'tamil' | 'english'].heirsTable.maritalStatus.divorced}</option>
                              <option value="widowed">{t[language as 'tamil' | 'english'].heirsTable.maritalStatus.widowed}</option>
                            </select>
                          </td>
                          <td className="px-2 py-1 border-b">
                            <input
                              type="text"
                              value={heir.education}
                              onChange={(e) => updateHeir(heir.id, 'education', e.target.value)}
                              className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded"
                              placeholder={t[language as 'tamil' | 'english'].placeholderHeirEducation}
                            />
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
                              title={t[language as 'tamil' | 'english'].buttons.removeHeirTitle}
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
                    <p>{t[language as 'tamil' | 'english'].heirsTable.noHeirs}</p>
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
                <h3 className="text-sm font-semibold text-gray-900">{t[language as 'tamil' | 'english'].photo}</h3>
                <button type="button" className="text-xs text-blue-600" onClick={() => setShowPhoto(v => !v)}>
                  {showPhoto ? t[language as 'tamil' | 'english'].clearForm : t[language as 'tamil' | 'english'].register}
                </button>
              </div>
              {showPhoto && (
                <div className="flex flex-col items-center">
                  <div className="w-24 h-28 bg-white border-2 border-dashed border-gray-300 rounded flex items-center justify-center mb-2">
                    {(!newUser.photo && existingPhotoUrl) ? (
                      <>
                        <img 
                          src={existingPhotoUrl} 
                          alt="Profile" 
                          className="w-full h-full object-cover rounded"
                          onError={(e) => {
                            console.error('Failed to load existing photo:', existingPhotoUrl);
                            // Hide the image and show placeholder
                            e.currentTarget.style.display = 'none';
                            // Show a fallback placeholder
                            const placeholder = e.currentTarget.parentElement?.querySelector('.photo-placeholder');
                            if (placeholder) {
                              (placeholder as HTMLElement).style.display = 'block';
                            }
                          }}
                          onLoad={(e) => {
                            console.log('Successfully loaded existing photo:', existingPhotoUrl);
                            // Hide placeholder when image loads successfully
                            const placeholder = e.currentTarget.parentElement?.querySelector('.photo-placeholder');
                            if (placeholder) {
                              (placeholder as HTMLElement).style.display = 'none';
                            }
                          }}
                        />
                        <div className="photo-placeholder text-center text-gray-500" style={{ display: 'none' }}>
                          <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <p className="text-xs">Photo not found</p>
                        </div>
                      </>
                    ) : newUser.photo ? (
                      <img src={URL.createObjectURL(newUser.photo)} alt="Preview" className="w-full h-full object-cover rounded" />
                    ) : (
                      <div className="text-center text-gray-500">
                        <svg className="w-8 h-8 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-xs">{t[language as 'tamil' | 'english'].photo}</p>
                      </div>
                    )}
                  </div>
                  <label
                    htmlFor="photo-upload"
                    className="w-full px-2 py-1 bg-blue-500 text-white text-xs rounded cursor-pointer hover:bg-blue-600 text-center"
                  >
                    {newUser.photo ? t[language as 'tamil' | 'english'].replacePhoto : t[language as 'tamil' | 'english'].uploadPhoto}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-upload"
                  />
                </div>
              )}
            </div>
            {/* Action Buttons - Compact */}
            <div className="space-y-2">
              <button
                disabled={isSubmitting}
                onClick={handleAddUser}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded shadow hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isSubmitting ? t[language as 'tamil' | 'english'].saving : t[language as 'tamil' | 'english'].save}
              </button>
              <button
                onClick={clearForm}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded shadow hover:bg-gray-300 text-sm"
              >
                {t[language as 'tamil' | 'english'].clearForm}
              </button>
            </div>
          </div>
        </div>
        {/* PDF print flow removed on this page */}
      </div>
      </div>
    </div>
  );
}