import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/language';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   DESIGN TOKENS  (inline so no extra files needed)
───────────────────────────────────────────── */
const CSS_VARS = `
  :root {
    --saffron:   #f97316;
    --saffron-dk:#ea580c;
    --saffron-lt:#fff7ed;
    --gold:      #c9952a;
    --gold-lt:   #fef3d7;
    --stone:     #f7f4ef;
    --stone-dk:  #ede9e2;
    --ink:       #1a150e;
    --ink-md:    #4a3f32;
    --ink-lt:    #857368;
    --border:    #d9cfc5;
    --white:     #ffffff;
    --red:       #c0392b;
    --green:     #1e7a4a;
    --radius:    10px;
    --shadow:    0 2px 12px rgba(26,21,14,.08);
    --shadow-lg: 0 8px 32px rgba(26,21,14,.14);
  }
`;

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type Heir = {
  id: number;
  serialNumber: number;
  name: string;
  race: string;
  maritalStatus: 'unmarried' | 'married' | 'divorced' | 'widowed';
  education: string;
  birthDate: string;
};

/* ─────────────────────────────────────────────
   SMALL REUSABLE ATOMS (styled inline)
───────────────────────────────────────────── */
const Field: React.FC<{ label: string; required?: boolean; error?: string; children: React.ReactNode }> = ({
  label, required, error, children
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-md)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}{required && <span style={{ color: 'var(--saffron)', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{error}</span>}
  </div>
);

const StyledInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }>(
  ({ hasError, style, ...props }, ref) => (
    <input
      ref={ref}
      {...props}
      style={{
        height: 36,
        padding: '0 10px',
        borderRadius: 8,
        border: `1.5px solid ${hasError ? 'var(--red)' : 'var(--border)'}`,
        background: 'var(--white)',
        fontSize: 13,
        color: 'var(--ink)',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'border-color .15s',
        ...style,
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--saffron)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = hasError ? 'var(--red)' : 'var(--border)'; }}
    />
  )
);

const StyledSelect = ({ hasError = false, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) => (
  <select
    {...props}
    style={{
      height: 36,
      padding: '0 10px',
      borderRadius: 8,
      border: `1.5px solid ${hasError ? 'var(--red)' : 'var(--border)'}`,
      background: 'var(--white)',
      fontSize: 13,
      color: 'var(--ink)',
      outline: 'none',
      width: '100%',
      cursor: 'pointer',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23857368' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 10px center',
    }}
  >
    {children}
  </select>
);

const SectionCard: React.FC<{
  title: string;
  icon: string;
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
  extra?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, collapsible, open = true, onToggle, extra, children }) => (
  <div style={{
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    border: '1.5px solid var(--border)',
    overflow: 'hidden',
    boxShadow: 'var(--shadow)',
  }}>
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'linear-gradient(90deg,var(--stone) 0%,var(--white) 100%)',
        borderBottom: open ? '1.5px solid var(--border)' : 'none',
        cursor: collapsible ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      onClick={collapsible ? onToggle : undefined}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        {title}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {extra}
        {collapsible && (
          <span style={{
            fontSize: 10, color: 'var(--ink-lt)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .2s',
            display: 'inline-block',
          }}>▼</span>
        )}
      </span>
    </div>
    {open && <div style={{ padding: '12px 14px' }}>{children}</div>}
  </div>
);

const PrimaryBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }> = ({ fullWidth, children, style, ...props }) => (
  <button
    {...props}
    style={{
      background: 'linear-gradient(135deg,#f97316 0%,#ea580c 100%)',
      color: '#fff',
      border: 'none',
      borderRadius: 8,
      padding: '0 18px',
      height: 38,
      fontSize: 13,
      fontWeight: 700,
      cursor: props.disabled ? 'not-allowed' : 'pointer',
      opacity: props.disabled ? 0.6 : 1,
      width: fullWidth ? '100%' : undefined,
      letterSpacing: '0.02em',
      boxShadow: '0 2px 8px rgba(212,87,42,.25)',
      transition: 'opacity .15s, transform .1s',
      ...style,
    }}
    onMouseEnter={e => { if (!props.disabled) e.currentTarget.style.opacity = '0.88'; }}
    onMouseLeave={e => { e.currentTarget.style.opacity = props.disabled ? '0.6' : '1'; }}
  >
    {children}
  </button>
);

const GhostBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { fullWidth?: boolean }> = ({ fullWidth, children, style, ...props }) => (
  <button
    {...props}
    style={{
      background: 'transparent',
      color: 'var(--saffron)',
      border: '1.5px solid var(--border)',
      borderRadius: 8,
      padding: '0 14px',
      height: 36,
      fontSize: 12,
      fontWeight: 600,
      cursor: 'pointer',
      width: fullWidth ? '100%' : undefined,
      transition: 'background .15s',
      ...style,
    }}
    onMouseEnter={e => { e.currentTarget.style.background = 'var(--saffron-lt)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
  >
    {children}
  </button>
);

const IconBtn: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }> = ({ danger, style, ...props }) => (
  <button
    {...props}
    style={{
      background: danger ? '#fff0ef' : 'var(--stone)',
      color: danger ? 'var(--red)' : 'var(--ink-md)',
      border: `1px solid ${danger ? '#ffccc7' : 'var(--border)'}`,
      borderRadius: 6,
      width: 28, height: 28,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      fontSize: 14,
      flexShrink: 0,
      transition: 'background .15s',
      ...style,
    }}
  >
    {props.children}
  </button>
);

/* ─────────────────────────────────────────────
   TRANSLATIONS
───────────────────────────────────────────── */
const translations = {
  tamil: {
     pageTitle: 'Landowners Tax Registration',
  
    pageSubtitle: 'Landowners Tax Registration',
    generalInfo: 'General Info',
    clearForm: 'Clear',
    clearFormTitle: 'Clear all fields',
    landownerFinancials: 'Landowner Details',
    personalHeirDetails: 'Personal & Heir Details',
    outstandingAmount: 'Outstanding Amount',
    heirsTitle: 'Heirs / Family Details',
    addHeir: '+ Add Heir',
    exit: 'Exit',
    register: 'Show',
    save: 'Save',
    saving: 'Saving…',
    lookingUp: 'Looking up…',
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
    clan: 'Koottam',
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
    selectClan: 'Select Koottam',
    selectGroup: 'Select Group',
    heirsTable: {
      sno: '#',
      name: 'Name',
      race: 'Race / Community',
      marriage: 'Marital Status',
      education: 'Education',
      bdate: 'Birth Date',
      action: '',
      noHeirs: 'No heirs added yet',
      addHeirHint: 'Click "+ Add Heir" to add detailed heir information',
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
      adding: 'Adding…',
    },
    success: { saved: 'Saved successfully', updated: 'Updated successfully' },
    errors: { general: 'Failed to save', required: 'Required' },
    hide: 'Hide',
    familyRef: 'Family Reference (T-2024-XXX)',
    linkedTo: 'Linked to Family:',
    fatherSearch: 'Search by Family Reference',
  },
  english: {
     pageTitle: 'காணியாளர்கள் வரி பதிவு',
    pageSubtitle: 'Landowners Tax Registration',
    generalInfo: 'பொது தகவல்',
    clearForm: 'அழிக்க',
    clearFormTitle: 'அனைத்தையும் அழி',
    landownerFinancials: 'காணியாளர் விவரங்கள்',
    personalHeirDetails: 'தனிப்பட்ட & வாரிசு விவரங்கள்',
    outstandingAmount: 'நிலுவை தொகை',
    heirsTitle: 'வாரிசுதாரர்கள் (குடும்ப விவரங்கள்)',
    addHeir: '+ வாரிசு சேர்',
    exit: 'வெளியேறு',
    register: 'காட்டு',
    save: 'சேமிக்க',
    saving: 'சேமிக்கிறது…',
    lookingUp: 'தேடுகிறது…',
    autofillHint: 'கைபேசியை உள்ளிட்டவுடன் பதிவுகளில் இருந்து விவரங்கள் தானாக நிரப்படும்',
    receiptNumber: 'ரசீது எண்',
    date: 'தேதி',
    landownerNo: 'காணியாளர் எண்',
    mobileNumber: 'கைபேசி எண்',
    name: 'பெயர்',
    alternativeName: 'கடைசி பெயர்',
    wifeName: 'மனைவி பெயர்',
    fatherName: 'தந்தை பெயர்',
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
      marriage: 'திருமண நிலை',
      education: 'படிப்பு',
      bdate: 'பிறந்த தேதி',
      action: '',
      noHeirs: 'வாரிசுகள் எதுவும் சேர்க்கப்படவில்லை',
      addHeirHint: "\'வாரிசு சேர்\' ஐ சொடுக்கவும்",
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
      adding: 'சேர்க்கப்படுகிறது…',
    },
    success: { saved: 'வெற்றிகரமாக சேமிக்கப்பட்டது', updated: 'புதுப்பிக்கப்பட்டது' },
    errors: { general: 'சேமிக்க முடியவில்லை', required: 'அவசியம்' },
    hide: 'மறை',
    familyRef: 'குடும்ப குறிப்பு எண் (T-2024-XXX)',
    linkedTo: 'குடும்பத்துடன் இணைக்கப்பட்டது:',
    fatherSearch: 'குடும்ப குறிப்பு எண் மூலம் தேடு',
  },
} as const;

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function TempleUserEntryPage() {
  const { user, token } = useAuth();
  const { language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const editId = id ? parseInt(id, 10) : null;

  const lang = (language as 'tamil' | 'english') in translations
    ? (language as 'tamil' | 'english')
    : 'tamil';
  const t = translations[lang];

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /* ── state ── */
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

  const [masterClans, setMasterClans] = useState<string[]>([]);
  const [masterGroups, setMasterGroups] = useState<string[]>([]);
  const [masterOccupations, setMasterOccupations] = useState<string[]>([]);
  const [masterEducations, setMasterEducations] = useState<string[]>([]);

  const [showAddress, setShowAddress] = useState(true);
  const [showIdDetails, setShowIdDetails] = useState(false);
  const [showHeirs, setShowHeirs] = useState(false);
  const [showPhoto, setShowPhoto] = useState(true);

  /* ── master data ── */
  useEffect(() => {
    if (user?.templeId && token) {
      (async () => {
        try {
          const [clansRes, groupsRes, occupationsRes, educationsRes] = await Promise.all([
            fetch(`https://templeapi.agniplay.com/api/master/clans/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`https://templeapi.agniplay.com/api/master/groups/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`https://templeapi.agniplay.com/api/master/occupations/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`https://templeapi.agniplay.com/api/master/educations/${user.templeId}`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (clansRes.ok) setMasterClans((await clansRes.json()).map((x: any) => x.name));
          if (groupsRes.ok) setMasterGroups((await groupsRes.json()).map((x: any) => x.name));
          if (occupationsRes.ok) setMasterOccupations((await occupationsRes.json()).map((x: any) => x.name));
          if (educationsRes.ok) {
            setMasterEducations((await educationsRes.json()).map((x: any) => x.name));
          } else {
            setMasterEducations(['Illiterate','Primary','Secondary','Higher Secondary','Diploma','Bachelor Degree','Master Degree','PhD','Professional Course','Technical Training','Other']);
          }
        } catch (e) { console.error('Master data error', e); }
      })();
    }
  }, [user, token]);



  /* ── edit mode load ── */
  useEffect(() => {
    if (!editId || !token) return;
    (async () => {
      try {
        const res = await fetch(`https://templeapi.agniplay.com/api/registrations/${editId}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load');
        const r = data.data;
        setNewUser(prev => ({
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
          heirs: Array.isArray(r.heirs) ? r.heirs.map((h: any, idx: number) => ({
            id: Date.now() + idx,
            serialNumber: h.serial_number ?? (idx + 1),
            name: h.name || '',
            race: h.race || '',
            maritalStatus: (h.marital_status || 'unmarried') as Heir['maritalStatus'],
            education: h.education || '',
            birthDate: h.birth_date || '',
          })) : [],
        }));
        if (r.photo_path) {
          const base = 'https://templeapi.agniplay.com/public';
          const url = r.photo_path.startsWith('http') ? r.photo_path : `${base}${r.photo_path.startsWith('/') ? '' : '/'}${r.photo_path}`;
          setExistingPhotoUrl(url);
        }
      } catch (e) { console.error('Edit load error', e); }
    })();
  }, [editId, token, today]);

  /* ── auto-dismiss success ── */
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  /* ── helpers ── */
  const fmt10 = (v: string) => v.replace(/\D/g, '').slice(0, 10);
  const fmtAadhaar = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.length <= 4) return d;
    if (d.length <= 8) return `${d.slice(0,4)}-${d.slice(4)}`;
    return `${d.slice(0,4)}-${d.slice(4,8)}-${d.slice(8,12)}`;
  };

  const set = (field: keyof typeof newUser, value: any) =>
    setNewUser(prev => ({ ...prev, [field]: value }));

  const clearErr = (field: string) =>
    setErrors(prev => ({ ...prev, [field]: '' }));

  /* ── family lookup ── */
  const lookupFamilyByReference = async (refNumber: string) => {
    const cleanRef = (refNumber || '').trim();
    if (!cleanRef || cleanRef.length < 3) { setErr('Reference number too short'); return; }
    setLookingUp(true); setErr(null);
    try {
      const res = await fetch(
        `https://templeapi.agniplay.com/api/tax-registrations/by-reference/${encodeURIComponent(cleanRef)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const fd = data.data;
          setNewUser(prev => ({
            ...prev,
            fatherName: fd.name || prev.fatherName,
            clan: fd.clan || prev.clan,
            group: fd.group || prev.group,
            parentReferenceId: cleanRef,
            familyHeadReference: fd.family_head_reference || fd.reference_number || cleanRef,
          }));
          setMsg(`✅ Linked to Family: ${fd.name}`);
        } else { setErr('No tax registration found with this reference'); }
      } else if (res.status === 404) { setErr('No tax registration found with this reference'); }
      else { setErr('Failed to search family reference'); }
    } catch { setErr('Error searching family reference'); }
    finally { setLookingUp(false); }
  };

  /* ── validation ── */
  const validateForm = (): Record<string, string> => {
    const e: Record<string, string> = {};
    const req = t.errors.required;
    if (!newUser.date) e.date = req;
    if (!newUser.mobileNumber) e.mobileNumber = req;
    else if (!/^\d{10}$/.test(newUser.mobileNumber)) e.mobileNumber = 'Enter valid 10-digit mobile number';
    if (!newUser.name) e.name = req;
    if (!newUser.fatherName) e.fatherName = req;
    if (!newUser.education) e.education = req;
    if (!newUser.occupation) e.occupation = req;
    if (!newUser.address) e.address = req;
    newUser.heirs.forEach((h, i) => {
      if (!h.name) e[`heir_${i}_name`] = req;
      if (!h.race) e[`heir_${i}_race`] = req;
    });
    setErrors(e);
    return e;
  };

  /* ── fetch next ref ── */
  const fetchNextRef = useCallback(async (year: string) => {
    if (!token || !year) return;
    try {
      // Trying next-ref which is consistent with tax-registrations pattern
      const res = await fetch(`https://templeapi.agniplay.com/api/registrations/next-ref?year=${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Handle various possible response formats, prioritize reference_number as verified by user
      const nextRef = data.reference_number || data.ref || data.nextReference || data.nextRef;
      if (res.ok && nextRef) {
        setNewUser(prev => ({ ...prev, receiptNumber: nextRef }));
      }
    } catch (err) {
      console.error('Fetch next ref failed:', err);
    }
  }, [token]);

  /* ── fetch next ref on mount & year change ── */
  useEffect(() => {
    if (!editId && token && newUser.year) {
      fetchNextRef(newUser.year);
    }
  }, [token, editId, newUser.year, fetchNextRef]);

  /* ── clear form ── */
  const blank = () => ({
    receiptNumber: '', date: today, mobileNumber: '', name: '', alternativeName: '',
    wifeName: '', fatherName: '', address: '', postalCode: '',
    year: new Date().getFullYear().toString(), amount: '', amountPaid: '', donation: '',
    totalAmount: '', education: '', occupation: '', aadhaarNumber: '', clan: '', group: '',
    maleHeirs: 0, femaleHeirs: 0, outstandingAmount: '', photo: null as File | null,
    heirs: [] as Heir[], parentReferenceId: '', familyHeadReference: '', relationshipType: 'self',
  });

  const clearForm = () => { setNewUser(blank()); setErrors({}); setErr(null); setMsg(null); setExistingPhotoUrl(null); };
  const resetAfterSave = () => {
    const fresh = blank();
    setNewUser(fresh);
    setErrors({});
    setErr(null);
    setExistingPhotoUrl(null);
    fetchNextRef(fresh.year);
  };

  /* ── heirs ── */
  const addHeir = () => setNewUser(prev => ({
    ...prev,
    heirs: [...prev.heirs, { id: Date.now(), serialNumber: prev.heirs.length + 1, name: '', race: '', maritalStatus: 'unmarried', education: '', birthDate: '' }],
  }));
  const updateHeir = (hid: number, field: keyof Heir, value: any) =>
    setNewUser(prev => ({ ...prev, heirs: prev.heirs.map(h => h.id === hid ? { ...h, [field]: value } : h) }));
  const removeHeir = (hid: number) =>
    setNewUser(prev => ({ ...prev, heirs: prev.heirs.filter(h => h.id !== hid).map((h, i) => ({ ...h, serialNumber: i + 1 })) }));

  /* ── photo ── */
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErr('Photo size must be less than 5MB'); return; }
    if (!file.type.startsWith('image/')) { setErr('Only image files are allowed'); return; }
    setNewUser(prev => ({ ...prev, photo: file }));
    setExistingPhotoUrl(null);
    setErr(null);
  };

  /* ── submit ── */
  const handleAddUser = async () => {
    if (Object.keys(validateForm()).length > 0) { setErr('Please fix the highlighted fields'); return; }
    setIsSubmitting(true); setErr(null); setMsg(null);
    try {
      const isEdit = !!editId;
      const url = isEdit ? `https://templeapi.agniplay.com/api/registrations/${editId}` : 'https://templeapi.agniplay.com/api/registrations';
      const method = isEdit ? 'PUT' : 'POST';
      const heirsPayload = newUser.heirs.map(h => ({ serialNumber: h.serialNumber, name: h.name, race: h.race, maritalStatus: h.maritalStatus, education: h.education, birthDate: h.birthDate }));

      let res: Response;
      if (newUser.photo) {
        const fd = new FormData();
        fd.append('photo', newUser.photo);
        const fields: Record<string, string> = {
          referenceNumber: newUser.receiptNumber, date: newUser.date, name: newUser.name,
          alternativeName: newUser.alternativeName, wifeName: newUser.wifeName, education: newUser.education,
          occupation: newUser.occupation, fatherName: newUser.fatherName, address: newUser.address,
          birthDate: '', village: '', mobileNumber: newUser.mobileNumber, aadhaarNumber: newUser.aadhaarNumber,
          panNumber: '', clan: newUser.clan, group: newUser.group, postalCode: newUser.postalCode,
          maleHeirs: newUser.maleHeirs.toString(), femaleHeirs: newUser.femaleHeirs.toString(),
          heirs: JSON.stringify(heirsPayload), parentReferenceId: newUser.parentReferenceId,
          familyHeadReference: newUser.familyHeadReference, relationshipType: newUser.relationshipType,
        };
        Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
        res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` }, body: fd });
      } else {
        res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            referenceNumber: newUser.receiptNumber, date: newUser.date, name: newUser.name,
            alternativeName: newUser.alternativeName, wifeName: newUser.wifeName, education: newUser.education,
            occupation: newUser.occupation, fatherName: newUser.fatherName, address: newUser.address,
            birthDate: '', village: '', mobileNumber: newUser.mobileNumber, aadhaarNumber: newUser.aadhaarNumber,
            panNumber: '', clan: newUser.clan, group: newUser.group, postalCode: newUser.postalCode,
            maleHeirs: newUser.maleHeirs, femaleHeirs: newUser.femaleHeirs, heirs: heirsPayload,
            parentReferenceId: newUser.parentReferenceId, familyHeadReference: newUser.familyHeadReference,
            relationshipType: newUser.relationshipType,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setMsg(isEdit ? t.success.updated : t.success.saved);
      if (!isEdit) resetAfterSave();
    } catch (e: any) {
      setErr(e?.message || t.errors.general);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  const photoSrc = newUser.photo
    ? URL.createObjectURL(newUser.photo)
    : existingPhotoUrl ?? null;

  return (
    <>
      {/* Inject CSS vars */}
      <style>{CSS_VARS}</style>

      <div style={{ minHeight: '100vh', background: 'var(--stone)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* ── TOP HEADER BAR ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--saffron) 0%, var(--saffron-dk) 100%)',
          padding: '0 20px',
          boxShadow: '0 4px 15px rgba(234, 88, 12, 0.2)',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            {/* Temple icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36,
                background: 'rgba(255,255,255,.18)',
                borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                backdropFilter: 'blur(4px)',
              }}>🛕</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>
                  {t.pageTitle}
                </div>
                <div style={{ color: 'rgba(255,255,255,.72)', fontSize: 11, fontWeight: 400 }}>
               
                </div>
              </div>
            </div>
            {/* Right-side metadata chips */}
         
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>

          {/* Alert Strip */}
          {(msg || err) && (
            <div style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 10,
              border: `1.5px solid ${err ? '#f5c6c6' : '#a8d5b5'}`,
              background: err ? '#fff5f5' : '#f0faf4',
              display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: 'var(--shadow)',
            }}>
              <span style={{ fontSize: 18 }}>{err ? '⚠️' : '✅'}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 12, color: err ? 'var(--red)' : 'var(--green)' }}>
                  {err ? 'Error' : 'Success'}
                </div>
                <div style={{ fontSize: 13, color: err ? '#7a2020' : '#1a5c36' }}>{err || msg}</div>
              </div>
              <button
                onClick={() => { setErr(null); setMsg(null); }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-lt)' }}
              >✕</button>
            </div>
          )}

          {/* ── GRID LAYOUT ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16 }}>

            {/* LEFT: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* General Info */}
              <SectionCard title={t.generalInfo} icon="📋" extra={
                <GhostBtn onClick={clearForm} style={{ height: 28, padding: '0 10px', fontSize: 11 }}>
                  🗑️ {t.clearForm}
                </GhostBtn>
              }>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                  <Field label={t.date} required error={errors.date}>
                    <StyledInput
                      type="date"
                      hasError={!!errors.date}
                      value={newUser.date}
                      onChange={e => { set('date', e.target.value); clearErr('date'); }}
                    />
                  </Field>
                  <Field label={t.year}>
                    <StyledSelect value={newUser.year} onChange={e => set('year', e.target.value)}>
                      {Array.from({ length: 21 }, (_, i) => 2020 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </StyledSelect>
                  </Field>
                  <Field label={t.receiptNumber}>
                    <StyledInput
                      value={newUser.receiptNumber}
                      onChange={e => set('receiptNumber', e.target.value)}
                      placeholder="Auto-generated"
                      style={{ background: '#fafaf8' }}
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* Landowner Details */}
              <SectionCard title={t.landownerFinancials} icon="👤">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>

                  <Field label={t.mobileNumber} required error={errors.mobileNumber}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <StyledInput
                        type="tel"
                        hasError={!!errors.mobileNumber}
                        value={newUser.mobileNumber}
                        onChange={e => { set('mobileNumber', fmt10(e.target.value)); clearErr('mobileNumber'); }}
                        placeholder={t.placeholderMobile}
                        maxLength={10}
                        style={{ flex: 1 }}
                      />
                      {lookingUp && <span style={{ fontSize: 11, color: 'var(--saffron)', alignSelf: 'center', whiteSpace: 'nowrap' }}>🔍</span>}
                    </div>
                  </Field>

                  <Field label={t.name} required error={errors.name}>
                    <StyledInput
                      hasError={!!errors.name}
                      value={newUser.name}
                      onChange={e => { set('name', e.target.value); clearErr('name'); }}
                    />
                  </Field>

                  <Field label={t.alternativeName}>
                    <StyledInput value={newUser.alternativeName} onChange={e => set('alternativeName', e.target.value)} />
                  </Field>

                  <Field label={t.wifeName}>
                    <StyledInput value={newUser.wifeName} onChange={e => set('wifeName', e.target.value)} />
                  </Field>

                  {/* Father Name with lookup */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <Field label={t.fatherName} required error={errors.fatherName}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <StyledInput
                          hasError={!!errors.fatherName}
                          value={newUser.fatherName}
                          onChange={e => { set('fatherName', e.target.value); clearErr('fatherName'); }}
                          placeholder={lang === 'tamil' ? 'தந்தையின் பெயர்' : "Father's Name"}
                          style={{ flex: 1 }}
                        />
                        <IconBtn
                          onClick={() => lookupFamilyByReference(newUser.parentReferenceId || newUser.fatherName)}
                          disabled={lookingUp}
                          title={t.fatherSearch}
                          style={{ width: 36, height: 36 }}
                        >
                          {lookingUp ? '…' : '🔍'}
                        </IconBtn>
                      </div>
                    </Field>
                    <div style={{ marginTop: 6 }}>
                      <StyledInput
                        value={newUser.parentReferenceId}
                        onChange={e => set('parentReferenceId', e.target.value)}
                        placeholder={t.familyRef}
                        style={{ fontSize: 12, height: 32 }}
                      />
                    </div>
                    {newUser.parentReferenceId && (
                      <div style={{
                        marginTop: 5, fontSize: 11, color: '#7a4f00',
                        background: 'var(--gold-lt)', border: '1px solid #f0d080',
                        borderRadius: 6, padding: '4px 8px',
                      }}>
                        🔗 {t.linkedTo} <strong>{newUser.parentReferenceId}</strong>
                      </div>
                    )}
                  </div>

                  <Field label={t.educationLabel} required error={errors.education}>
                    <StyledSelect
                      hasError={!!errors.education}
                      value={newUser.education}
                      onChange={e => { set('education', e.target.value); clearErr('education'); }}
                    >
                      <option value="">{t.selectEducation}</option>
                      {masterEducations.map(edu => <option key={edu} value={edu}>{edu}</option>)}
                    </StyledSelect>
                  </Field>

                  <Field label={t.occupationLabel} required error={errors.occupation}>
                    <StyledSelect
                      hasError={!!errors.occupation}
                      value={newUser.occupation}
                      onChange={e => { set('occupation', e.target.value); clearErr('occupation'); }}
                    >
                      <option value="">{t.selectOccupation}</option>
                      {masterOccupations.map(occ => <option key={occ} value={occ}>{occ}</option>)}
                    </StyledSelect>
                  </Field>

                </div>
              </SectionCard>

              {/* Address */}
              <SectionCard
                title={`${t.address}${errors.address ? ' ⚠️' : ''}`}
                icon="🏠"
                collapsible
                open={showAddress}
                onToggle={() => setShowAddress(v => !v)}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <Field label={t.address} required error={errors.address}>
                    <StyledInput
                      value={newUser.address}
                      onChange={e => { set('address', e.target.value); clearErr('address'); }}
                      placeholder={t.placeholderAddress}
                      hasError={!!errors.address}
                    />
                  </Field>
                  <Field label={t.postalCode}>
                    <StyledInput
                      value={newUser.postalCode}
                      onChange={e => set('postalCode', e.target.value)}
                      placeholder={t.placeholderPostal}
                      maxLength={6}
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* Personal & ID Details */}
              <SectionCard
                title={t.personalHeirDetails}
                icon="🪪"
                collapsible
                open={showIdDetails}
                onToggle={() => setShowIdDetails(v => !v)}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
                  <Field label={t.aadhaarNumber}>
                    <StyledInput
                      value={newUser.aadhaarNumber}
                      onChange={e => set('aadhaarNumber', fmtAadhaar(e.target.value))}
                      placeholder={t.placeholderAadhaar}
                      maxLength={14}
                    />
                  </Field>
                  <Field label={t.clan}>
                    <StyledSelect value={newUser.clan} onChange={e => set('clan', e.target.value)}>
                      <option value="">{t.selectClan}</option>
                      {masterClans.map(c => <option key={c} value={c}>{c}</option>)}
                    </StyledSelect>
                  </Field>
                  <Field label={t.group}>
                    <StyledSelect value={newUser.group} onChange={e => set('group', e.target.value)}>
                      <option value="">{t.selectGroup}</option>
                      {masterGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </StyledSelect>
                  </Field>
                  <Field label={t.maleHeirs}>
                    <StyledInput
                      type="number"
                      min={0}
                      value={newUser.maleHeirs}
                      onChange={e => set('maleHeirs', parseInt(e.target.value) || 0)}
                    />
                  </Field>
                  <Field label={t.femaleHeirs}>
                    <StyledInput
                      type="number"
                      min={0}
                      value={newUser.femaleHeirs}
                      onChange={e => set('femaleHeirs', parseInt(e.target.value) || 0)}
                    />
                  </Field>
                </div>
              </SectionCard>

              {/* Heirs */}
              <SectionCard
                title={`${t.heirsTitle}${newUser.heirs.length ? ` (${newUser.heirs.length})` : ''}`}
                icon="👨‍👩‍👧‍👦"
                collapsible
                open={showHeirs}
                onToggle={() => setShowHeirs(v => !v)}
                extra={
                  <button
                    onClick={e => { e.stopPropagation(); addHeir(); setShowHeirs(true); }}
                    style={{
                      background: 'var(--saffron)', color: '#fff',
                      border: 'none', borderRadius: 6,
                      padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {t.addHeir}
                  </button>
                }
              >
                {newUser.heirs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-lt)' }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>👥</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.heirsTable.noHeirs}</div>
                    <div style={{ fontSize: 11, marginTop: 3 }}>{t.heirsTable.addHeirHint}</div>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--stone-dk)' }}>
                          {[t.heirsTable.sno, t.heirsTable.name, t.heirsTable.race, t.heirsTable.marriage, t.heirsTable.education, t.heirsTable.bdate, ''].map((h, i) => (
                            <th key={i} style={{
                              padding: '7px 8px', textAlign: 'left',
                              fontWeight: 700, fontSize: 10, textTransform: 'uppercase',
                              color: 'var(--ink-md)', letterSpacing: '0.05em',
                              borderBottom: '1.5px solid var(--border)',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {newUser.heirs.map((heir, index) => (
                          <tr key={heir.id} style={{ background: index % 2 === 0 ? 'var(--white)' : 'var(--stone)' }}>
                            <td style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--ink-lt)', fontWeight: 600 }}>{heir.serialNumber}</td>
                            <td style={{ padding: '4px 6px', minWidth: 130 }}>
                              <StyledInput
                                value={heir.name}
                                hasError={!!errors[`heir_${index}_name`]}
                                onChange={e => updateHeir(heir.id, 'name', e.target.value)}
                                placeholder={t.placeholderHeirName}
                                style={{ height: 30, fontSize: 12 }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', minWidth: 130 }}>
                              <StyledSelect
                                hasError={!!errors[`heir_${index}_race`]}
                                value={heir.race}
                                onChange={e => updateHeir(heir.id, 'race', e.target.value)}
                                style={{ height: 30, fontSize: 12 }}
                              >
                                <option value="">{t.selectRace}</option>
                                {masterClans.map(r => <option key={r} value={r}>{r}</option>)}
                              </StyledSelect>
                            </td>
                            <td style={{ padding: '4px 6px', minWidth: 130 }}>
                              <StyledSelect
                                value={heir.maritalStatus}
                                onChange={e => updateHeir(heir.id, 'maritalStatus', e.target.value as Heir['maritalStatus'])}
                                style={{ height: 30, fontSize: 12 }}
                              >
                                {(['unmarried','married','divorced','widowed'] as const).map(s => (
                                  <option key={s} value={s}>{t.heirsTable.maritalStatus[s]}</option>
                                ))}
                              </StyledSelect>
                            </td>
                            <td style={{ padding: '4px 6px', minWidth: 110 }}>
                              <StyledInput
                                value={heir.education}
                                onChange={e => updateHeir(heir.id, 'education', e.target.value)}
                                placeholder={t.placeholderHeirEducation}
                                style={{ height: 30, fontSize: 12 }}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', minWidth: 130 }}>
                              <StyledInput
                                type="date"
                                value={heir.birthDate}
                                onChange={e => updateHeir(heir.id, 'birthDate', e.target.value)}
                                style={{ height: 30, fontSize: 12 }}
                              />
                            </td>
                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                              <IconBtn danger onClick={() => removeHeir(heir.id)} title={t.buttons.removeHeirTitle}>✕</IconBtn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

            </div>

            {/* RIGHT: sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Photo Card */}
              <SectionCard
                title={t.photo}
                icon="📷"
                collapsible
                open={showPhoto}
                onToggle={() => setShowPhoto(v => !v)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  {/* Photo frame */}
                  <div style={{
                    width: 120, height: 140,
                    borderRadius: 10,
                    border: `2px dashed ${photoSrc ? 'var(--saffron)' : 'var(--border)'}`,
                    background: photoSrc ? 'transparent' : 'var(--stone)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    transition: 'border-color .2s',
                  }}>
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt="Profile"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setExistingPhotoUrl(null)}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--ink-lt)' }}>
                        <div style={{ fontSize: 32, marginBottom: 4 }}>👤</div>
                        <div style={{ fontSize: 10 }}>{t.photo}</div>
                        <div style={{ fontSize: 9, color: 'var(--ink-lt)', marginTop: 2 }}>{t.photoNote}</div>
                      </div>
                    )}
                  </div>

                  <label htmlFor="photo-upload" style={{
                    display: 'block', width: '100%',
                    background: 'var(--stone)', color: 'var(--saffron)',
                    border: '1.5px solid var(--saffron)',
                    borderRadius: 8, padding: '6px 0',
                    textAlign: 'center', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', transition: 'background .15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--saffron-lt)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--stone)'; }}
                  >
                    📎 {newUser.photo ? t.replacePhoto : t.uploadPhoto}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    id="photo-upload"
                    style={{ display: 'none' }}
                  />
                </div>
              </SectionCard>

              {/* Action Buttons */}
              <div style={{
                background: 'var(--white)',
                borderRadius: 'var(--radius)',
                border: '1.5px solid var(--border)',
                padding: 14,
                boxShadow: 'var(--shadow)',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <PrimaryBtn fullWidth onClick={handleAddUser} disabled={isSubmitting}>
                  {isSubmitting
                    ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 14 }}>⏳</span>
                        {t.saving}
                      </span>
                    : `💾 ${editId ? '✏️ Update' : t.save}`
                  }
                </PrimaryBtn>
                <GhostBtn fullWidth onClick={clearForm}>
                  🗑️ {t.clearForm}
                </GhostBtn>
              </div>

              {/* Form completion indicator */}
            
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus, textarea:focus { outline: none !important; }
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          /* Sidebar goes below on mobile */
        }
      `}</style>
    </>
  );
}