import {
  HomeIcon,
  UsersIcon,
  HeartIcon,
  CreditCardIcon,
  BarChartIcon,
  LandmarkIcon,
  HistoryIcon,
  SettingsIcon,
  CalendarIcon,
} from '../components/icons';

export type NavChild = {
  to: string;
  label: string;
  tamilLabel?: string;
  permissionId?: string;
  accessLevel?: 'view' | 'edit' | 'full';
};

export type NavItem = {
  to?: string;
  label: string;
  tamilLabel: string;
  icon: any;
  permissionId?: string;
  accessLevel?: 'view' | 'edit' | 'full';
  children?: NavChild[];
};

export const navigationTranslations = {
  tamil: {
    overview: 'முகப்பு',
    members: 'பணியாளர் பட்டியல்',
    staff:"பணியாளர்",
    memberEntry: 'பணியாளர்  பதிவு',
    reports: 'அறிக்கைகள்',
    dailyReport: 'தினசரி அறிக்கை',
    monthlyReport: 'மாதாந்திர அறிக்கை',
    journalLog: 'பத்திரிகை பதிவு',
    trialBalance: 'சோதனை இருப்பு',
    balanceSheet: 'இருப்பு நிலை அறிக்கை',
    masterData: 'முதன்மை தரவு',
    ledger: 'கணக்கு புத்தகம்',
    newEntry: 'புதிய பதிவு',
    viewEntries: 'பதிவுகளைக் காண்க',
    daybook: 'டேபுக்',
    daybookList: 'டேபுக் பட்டியல்',
    daybookEntry: 'டேபுக் பதிவு',
    pooja: 'பூஜை',
    poojaList: 'பூஜை பட்டியல்',
    poojaEntry: 'பூஜை பதிவு',
    poojaApproval: 'பூஜை ஒப்புதல்',
    hallBooking: 'மண்டபம் முன்பதிவு',
    hallBookings: 'மண்டப முன்பதிவுகள்',
    newBooking: 'புதிய முன்பதிவு',
    hallApprovals: 'மண்டப அங்கீகாரங்கள்',
    donations: 'நன்கொடைகள்',
    productDonationsEntry: 'பொருள் நன்கொடை - பதிவு',
    productDonationsList: 'பொருள் நன்கொடை - பட்டியல்',
    moneyDonationEntry: 'பண நன்கொடை பதிவு',
    moneyDonationList: 'பண நன்கொடை பட்டியல்',
    events: 'நிகழ்வுகள்',
    eventList: 'நிகழ்வு பட்டியல்',
    newEvent: 'புதிய நிகழ்வு',
    newMoonDays: 'அமாவாசை நாட்கள்',
    annadhanam: 'அன்னதானம்',
    annadhanamList: 'அன்னதான பட்டியல்',
    annadhanamEntry: 'அன்னதான பதிவு',
    annadhanamApproval: 'அன்னதான அங்கீகாரம்',
    receipts: 'ரசீதுகள்',
    receiptList: 'ரசீது பட்டியல்',
    receiptEntry: 'ரசீது பதிவு',
    tax: 'வரி',
    userRegister: 'பயனர் பதிவேடு',
    userList: 'பயனர் பட்டியல்',
    taxEntry: 'வரி பதிவு',
    taxList: 'வரி பட்டியல்',
    taxSettings: 'வரி அமைப்புகள்',
    properties: 'சொத்துக்கள்',
    propertiesList: 'சொத்து பட்டியல்',
    assets: 'சொத்துகள்',
    assetManagement: 'சொத்து மேலாண்மை',
    newProperty: 'புதிய சொத்து',
    sessionLogs: 'அமர்வு பதிவுகள்',
    settings: 'அமைப்புகள்',
    generalSettings: 'பொது அமைப்புகள்',
    pdfSettings: 'PDF அமைப்புகள்',
    myPreferences: 'எனது விருப்பங்கள்',
    logPage: 'பதிவு பக்கம்'
  },
  english: {
    overview: 'Home',
    staff :"Staff",
    members: 'Staff List',
    memberEntry: 'Staff Entry',
    reports: 'Reports',
    dailyReport: 'Daily Report',
    monthlyReport: 'Monthly Report',
    journalLog: 'Journal Log',
    trialBalance: 'Trial Balance',
    balanceSheet: 'Balance Sheet',
    masterData: 'Master Data',
    ledger: 'Ledger',
    newEntry: 'New Entry',
    viewEntries: 'View Entries',
    daybook: 'Daybook',
    daybookList: 'Daybook List',
    daybookEntry: 'Daybook Entry',
    pooja: 'Pooja',
    poojaList: 'Pooja List',
    poojaEntry: 'Pooja Entry',
    poojaApproval: 'Pooja Approval',
    hallBooking: 'Hall Booking',
    hallBookings: 'Hall Bookings',
    newBooking: 'New Booking',
    hallApprovals: 'Hall Approvals',
    donations: 'Donations',
    productDonationsEntry: 'Product Donations - Entry',
    productDonationsList: 'Product Donations - List',
    moneyDonationEntry: 'Money Donation Entry',
    moneyDonationList: 'Money Donation List',
    events: 'Events',
    eventList: 'Event List',
    newEvent: 'New Event',
    newMoonDays: 'New Moon Days',
    annadhanam: 'Annadhanam',
    annadhanamList: 'Annadhanam List',
    annadhanamEntry: 'Annadhanam Entry',
    annadhanamApproval: 'Annadhanam Approval',
    receipts: 'Receipts',
    receiptList: 'Receipt List',
    receiptEntry: 'Receipt Entry',
    tax: 'Tax',
    userRegister: 'User Register',
    userList: 'User List',
    taxEntry: 'Tax Entry',
    taxList: 'Tax List',
    taxSettings: 'Tax Settings',
    properties: 'Properties',
    propertiesList: 'Properties List',
    newProperty: 'New Property',
    assets: 'Assets',
    assetManagement: 'Asset Management',
    sessionLogs: 'Session Logs',
    settings: 'Settings',
    generalSettings: 'General Settings',
    pdfSettings: 'PDF Settings',
    myPreferences: 'My Preferences',
    logPage: 'Log Page'
  }
} as const;

export const sidebarItems: NavItem[] = [
  {
    label: navigationTranslations.english.overview,
    tamilLabel: navigationTranslations.tamil.overview,
    to: '/dashboard',
    icon: HomeIcon
  },
  {
    label: navigationTranslations.english.annadhanam,
    tamilLabel: navigationTranslations.tamil.annadhanam,
    icon: HeartIcon,
    children: [
      { 
        to: 'annadhanam/entry', 
        label: navigationTranslations.english.annadhanamEntry, 
        tamilLabel: navigationTranslations.tamil.annadhanamEntry, 
        permissionId: 'annadhanam_registrations',
        accessLevel: 'edit'
      },
      { 
        to: 'annadhanam/list', 
        label: navigationTranslations.english.annadhanamList, 
        tamilLabel: navigationTranslations.tamil.annadhanamList, 
        permissionId: 'annadhanam_registrations',
        accessLevel: 'view'
      },
      { 
        to: 'annadhanam/approval', 
        label: navigationTranslations.english.annadhanamApproval, 
        tamilLabel: navigationTranslations.tamil.annadhanamApproval, 
        permissionId: 'annadhanam_approval' 
      }
    ]
  },
  {
    label: navigationTranslations.english.donations,
    tamilLabel: navigationTranslations.tamil.donations,
    icon: HeartIcon,
    children: [

{
  to:'donations/entry',
  label :navigationTranslations.english.donations,
  tamilLabel:navigationTranslations.tamil.donations,
  permissionId:'edit_donations',
  accessLevel:'edit'
},


    /*  { 
        to: 'donation-product/entry', 
        label: navigationTranslations.english.productDonationsEntry, 
        tamilLabel: navigationTranslations.tamil.productDonationsEntry, 
        permissionId: 'edit_donations',
        accessLevel: 'edit'
      },*/
      { 
        to: 'donations/list', 
        label: navigationTranslations.english.productDonationsList, 
        tamilLabel: navigationTranslations.tamil.productDonationsList, 
        permissionId: 'view_donations',
        accessLevel: 'view'
      },
     /* { 
        to: 'donations/money-entry', 
        label: navigationTranslations.english.moneyDonationEntry, 
        tamilLabel: navigationTranslations.tamil.moneyDonationEntry, 
        permissionId: 'edit_donations',
        accessLevel: 'edit'
      },*/
    /*  { 
        to: 'donations/money-list', 
        label: navigationTranslations.english.moneyDonationList, 
        tamilLabel: navigationTranslations.tamil.moneyDonationList, 
        permissionId: 'view_donations',
        accessLevel: 'view'
      },*/
    ]
  },
  {
    label: navigationTranslations.english.events,
    tamilLabel: navigationTranslations.tamil.events,
    icon: CalendarIcon,
    children: [
      { 
        to: 'events/new', 
        label: navigationTranslations.english.newEvent, 
        tamilLabel: navigationTranslations.tamil.newEvent, 
        permissionId: 'edit_events',
        accessLevel: 'edit'
      },
      { 
        to: 'events', 
        label: navigationTranslations.english.eventList, 
        tamilLabel: navigationTranslations.tamil.eventList, 
        permissionId: 'view_events',
        accessLevel: 'view'
      },
      { 
        to: 'calendar/new-moon-days', 
        label: navigationTranslations.english.newMoonDays, 
        tamilLabel: navigationTranslations.tamil.newMoonDays, 
        permissionId: 'view_events' 
      },
    ]
  },
  {
    label: navigationTranslations.english.hallBooking,
    tamilLabel: navigationTranslations.tamil.hallBooking,
    icon: CalendarIcon,
    children: [
      { 
        to: 'hall/entry', 
        label: navigationTranslations.english.newBooking, 
        tamilLabel: navigationTranslations.tamil.newBooking, 
        permissionId: 'hall_booking', 
        accessLevel: 'edit' 
      },
      { 
        to: 'hall/list', 
        label: navigationTranslations.english.hallBookings, 
        tamilLabel: navigationTranslations.tamil.hallBookings, 
        permissionId: 'hall_booking', 
        accessLevel: 'view' 
      },
      { 
        to: 'hall/approvals', 
        label: navigationTranslations.english.hallApprovals, 
        tamilLabel: navigationTranslations.tamil.hallApprovals, 
        permissionId: 'hall_approval', 
        accessLevel: 'view' 
      },
    ]
  },
  {
    label: navigationTranslations.english.ledger,
    tamilLabel: navigationTranslations.tamil.ledger,
    icon: CreditCardIcon,
    children: [
      {
        to: 'ledger/entry',
        label: navigationTranslations.english.newEntry,
        tamilLabel: navigationTranslations.tamil.newEntry,
        permissionId: 'ledger_management',
        accessLevel: 'edit'
      },
      {
        to: 'ledger/list',
        label: navigationTranslations.english.viewEntries,
        tamilLabel: navigationTranslations.tamil.viewEntries,
        permissionId: 'ledger_management',
        accessLevel: 'view'
      },
    ]
  },
  {
    label: navigationTranslations.english.daybook,
    tamilLabel: navigationTranslations.tamil.daybook,
    icon: LandmarkIcon,
    children: [
      {
        to: 'daybook/list',
        label: navigationTranslations.english.daybookList,
        tamilLabel: navigationTranslations.tamil.daybookList,
        permissionId: 'daybook',
        accessLevel: 'view'
      },
    ]
  },
  {
    label: navigationTranslations.english.masterData,
    tamilLabel: navigationTranslations.tamil.masterData,
    to: 'master-data',
    icon: LandmarkIcon,
    permissionId: 'master_data',
    accessLevel: 'edit'
  },
  {
    label: navigationTranslations.english.members,
    tamilLabel: navigationTranslations.tamil.members,
    icon: UsersIcon,
    children: [
      { 
        to: 'members/entry', 
        label: navigationTranslations.english.staff, 
        tamilLabel: navigationTranslations.tamil.staff, 
        permissionId: 'member_entry',
        accessLevel: 'edit'
      },
      { 
        to: 'members', 
        label: navigationTranslations.english.members, 
        tamilLabel: navigationTranslations.tamil.members, 
        permissionId: 'member_entry',
        accessLevel: 'view'
      },
    ]
  },
  
  {
    label: navigationTranslations.english.pooja,
    tamilLabel: navigationTranslations.tamil.pooja,
    icon: CalendarIcon,
    children: [
      { 
        to: 'pooja/entry', 
        label: navigationTranslations.english.poojaEntry, 
        tamilLabel: navigationTranslations.tamil.poojaEntry, 
        permissionId: 'pooja_registrations',
        accessLevel: 'edit'
      },
      { 
        to: 'pooja/list', 
        label: navigationTranslations.english.poojaList, 
        tamilLabel: navigationTranslations.tamil.poojaList, 
        permissionId: 'pooja_registrations',
        accessLevel: 'view'
      },
      { 
        to: 'pooja/approval', 
        label: navigationTranslations.english.poojaApproval, 
        tamilLabel: navigationTranslations.tamil.poojaApproval, 
        permissionId: 'pooja_approval',
        accessLevel: 'view'
      }
    ]
  },
  {
    label: navigationTranslations.english.assets,
    tamilLabel: navigationTranslations.tamil.assets,
    icon: LandmarkIcon,
    children: [
      { 
        to: 'assets', 
        label: navigationTranslations.english.assetManagement, 
        tamilLabel: navigationTranslations.tamil.assetManagement, 
        permissionId: 'asset_management',
        accessLevel: 'view'
      },
    ]
  },
  {
    label: navigationTranslations.english.receipts,
    tamilLabel: navigationTranslations.tamil.receipts,
    icon: LandmarkIcon,
    children: [
      { 
        to: 'receipt/entry', 
        label: navigationTranslations.english.receiptEntry, 
        tamilLabel: navigationTranslations.tamil.receiptEntry, 
        permissionId: 'receipts', 
        accessLevel: 'edit' 
      },
      { 
        to: 'receipt/list', 
        label: navigationTranslations.english.receiptList, 
        tamilLabel: navigationTranslations.tamil.receiptList, 
        permissionId: 'receipts', 
        accessLevel: 'view' 
      },
     
    ]
  },
  {
    label: navigationTranslations.english.reports,
    tamilLabel: navigationTranslations.tamil.reports,
    icon: BarChartIcon,
    children: [
      { 
        to: 'reports/trial-balance', 
        label: navigationTranslations.english.trialBalance, 
        tamilLabel: navigationTranslations.tamil.trialBalance, 
        permissionId: 'reports',
        accessLevel: 'view'
      },
     
      { 
        to: 'reports/balance-sheet', 
        label: navigationTranslations.english.balanceSheet, 
        tamilLabel: navigationTranslations.tamil.balanceSheet, 
        permissionId: 'reports',
        accessLevel: 'view'
      },
    ]
  },
  {
    label: navigationTranslations.english.sessionLogs,
    tamilLabel: navigationTranslations.tamil.sessionLogs,
    to: 'session-logs',
    icon: HistoryIcon,
    permissionId: 'view_session_logs',
    accessLevel: 'view'
  },
  {
    label: navigationTranslations.english.tax,
    tamilLabel: navigationTranslations.tamil.tax,
    icon: LandmarkIcon,
    permissionId: 'tax_registrations',
    children: [
      { 
        to: 'registrations/text-entry', 
        label: navigationTranslations.english.userRegister, 
        tamilLabel: navigationTranslations.tamil.userRegister, 
        permissionId: 'user_registrations',
        accessLevel: 'edit'
      },
      { 
        to: 'registrations/list', 
        label: navigationTranslations.english.userList, 
        tamilLabel: navigationTranslations.tamil.userList, 
        permissionId: 'user_registrations',
        accessLevel: 'view'
      },
      { 
        to: 'tax/entry', 
        label: navigationTranslations.english.taxEntry, 
        tamilLabel: navigationTranslations.tamil.taxEntry, 
        permissionId: 'tax_registrations',
        accessLevel: 'edit'
      },
      { 
        to: 'tax/list', 
        label: navigationTranslations.english.taxList, 
        tamilLabel: navigationTranslations.tamil.taxList, 
        permissionId: 'tax_registrations',
        accessLevel: 'view'
      },
      { 
        to: 'tax/settings', 
        label: navigationTranslations.english.taxSettings, 
        tamilLabel: navigationTranslations.tamil.taxSettings, 
        permissionId: 'tax_registrations',
        accessLevel: 'edit'
      },
    ]
  },
  {
    label: navigationTranslations.english.settings,
    tamilLabel: navigationTranslations.tamil.settings,
    icon: SettingsIcon,
    children: [
      { 
        to: 'settings', 
        label: navigationTranslations.english.generalSettings, 
        tamilLabel: navigationTranslations.tamil.generalSettings, 
        permissionId: 'setting',
        accessLevel: 'edit'
      },
      { 
        to: 'settings/pdf', 
        label: navigationTranslations.english.pdfSettings, 
        tamilLabel: navigationTranslations.tamil.pdfSettings, 
        permissionId: 'pdf_settings',
        accessLevel: 'edit'
      },
      { 
        to: 'settings/my-preferences', 
        label: navigationTranslations.english.myPreferences, 
        tamilLabel: navigationTranslations.tamil.myPreferences, 
        permissionId: 'setting',
        accessLevel: 'view'
      },
      { 
        to: 'annadhanam/logs', 
        label: navigationTranslations.english.logPage, 
        tamilLabel: navigationTranslations.tamil.logPage, 
        permissionId: 'annadhanam_registrations',
        accessLevel: 'view'
      },
    ]
  },
];

export const getSidebarItems = (language: 'english' | 'tamil' = 'english') => {
  return sidebarItems.map(item => {
    const mappedChildren = Array.isArray(item.children)
      ? item.children
          .filter(Boolean)
          .map(child => ({
            ...child,
            // Ensure label is always defined for consumers
            label: language === 'tamil' ? ((child as any).tamilLabel || (child as any).label) : (child as any).label
          }))
      : undefined;

    return {
      ...item,
      label: language === 'tamil' ? item.tamilLabel : item.label,
      children: mappedChildren
    };
  });
};