import { theme, cn } from './theme';

// Form field styles - Uses centralized theme.ts
// Change values in theme.ts to update ALL pages automatically
export const formFieldStyles = {
  // Tax form specific styles
  taxForm: {
    container: cn(theme.layout.pageBackground, 'py-0.5 px-3'),
    header: cn(theme.layout.container),
    mainContainer: cn(theme.card.container, 'p-2'),
    section: 'bg-gray-50 rounded-lg p-1.5 mb-2',
    sectionHeader: 'flex items-center justify-between mb-1',
    sectionTitle: cn('text-sm font-semibold text-gray-900'),
    grid: cn(theme.layout.grid),
    input: cn(theme.input.base, 'text-sm px-2 py-1'),
    select: cn(theme.select.base, 'text-sm px-2 py-1'),
    label: cn('block text-xs font-medium mb-1', 'text-gray-900'),
    error: cn(theme.input.error, 'bg-red-50'),
    errorText: cn(theme.validation.errorText),
    button: {
      clear: cn(theme.button.danger, 'text-xs px-2 py-1'),
      lock: 'text-xs px-2 py-0.5 rounded border',
      lockActive: cn('text-orange-700 border-orange-300 bg-orange-50'),
      lockInactive: cn('text-gray-600 border-gray-300 bg-white'),
      action: cn(theme.button.primary, 'text-sm'),
      secondary: cn(theme.button.secondary, 'w-full'),
      add: 'px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700',
      delete: cn('text-red-600 hover:text-red-800 text-sm'),
      print: cn(theme.button.primary, 'px-4 py-2'),
      cancel: cn(theme.button.secondary, 'px-4 py-2'),
    },
    card: {
      header: cn(theme.card.header),
      title: cn('text-2xl font-bold text-center'),
    },
    modal: {
      content: 'mb-4 text-sm',
      actions: 'flex justify-end gap-2',
    },
    table: {
      container: 'overflow-x-auto',
      table: 'min-w-full bg-white border border-gray-300 rounded text-xs',
      thead: 'bg-gray-100',
      th: 'px-2 py-1 text-left font-medium text-gray-900 border-b',
      td: 'px-2 py-1 border-b',
    },
    alert: 'mb-3',
    loading: 'min-h-screen bg-gray-50 flex items-center justify-center',
    loadingSpinner: 'animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4',
    loadingText: 'text-gray-600',
  },
  // Table header
  tableHeader: {
    container: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 text-center',
    title: 'text-lg font-bold w-full'
  },
  // Input fields
  input: cn(theme.input.base, 'text-sm py-2 px-3 h-10'),
  
  // Textarea
  textarea: cn(theme.input.base, 'text-sm py-1.5 px-3 min-h-[36px]'),
  
  // Select
  select: cn(theme.select.base, 'text-sm py-2 px-3 h-10'),
  
  // Label
  label: cn(theme.spacing.inputPadding.withoutIcon, 'text-sm font-medium mb-1 text-gray-700'),
  
  // Error message
  error: cn(theme.validation.errorText),
  
  // Buttons
  button: {
    // Sizes
    sm: "px-3 py-1.5 text-xs h-8",
    md: "px-4 py-2 text-sm h-10",
    lg: "px-6 py-3 text-base h-12",
    // Variants - Uses centralized theme
    primary: cn(theme.button.primary, 'text-sm'),
    primarySm: cn(theme.button.primary, 'text-xs px-3 py-1.5'),
    outline: cn(theme.button.secondary, 'text-sm'),
    // Ledger specific buttons
    ledger: {
      primary: cn(theme.gradients.button, theme.gradients.buttonHover, 'text-white'),
      outline: cn(theme.button.secondary)
    }
  },
  
  // Card
  card: {
    container: cn(theme.card.container),
    header: cn(theme.card.header),
    content: cn(theme.card.content),
    title: cn('text-xl font-semibold text-center'),
    // Event-specific card styles
    event: {
      container: cn('w-full max-w-4xl'),
      header: cn(theme.card.header)
    }
  },
  
  // Form layout
  form: {
    container: "space-y-3",
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
  },
  
  // Colors
  colors: {
    primary: "bg-orange-500 hover:bg-orange-600 text-white",
    secondary: "bg-blue-500 hover:bg-blue-600 text-white",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
  },

  // Header styles
  header: {
    title: "text-2xl font-bold text-center",
    gradient: "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
  },

  // Register number display
  registerDisplay: {
    container: "flex items-center justify-between mb-4 bg-gray-50 py-1 px-3 rounded-lg",
    label: "text-sm font-semibold text-gray-600",
    value: "ml-1 text-gray-800 font-medium text-lg"
  },

  // Message display
  message: {
    success: "bg-green-50 text-green-700 border-green-200",
    error: "bg-red-50 text-red-700 border-red-200",
    container: "mb-6 p-4 rounded-lg border flex items-center text-base",
    icon: "mr-3 text-lg"
  },

  // Required field indicator
  required: "text-red-500",

  // Select dropdown
  selectDropdown: {
    container: "relative",
    dropdown: "absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none",
    icon: "w-5 h-5 text-gray-400"
  },

  // Action buttons container
  actions: {
    container: "flex flex-wrap gap-4 justify-end items-center pt-4 border-t border-gray-200 w-full",
    buttonGroup: "flex gap-3"
  },

  // Keyboard shortcut hint
  keyboardHint: {
    container: "text-sm text-gray-500 hidden md:flex items-center",
    key: "px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded",
    text: "ml-2"
  },

  // Error message with icon
  errorWithIcon: "flex items-center",
  errorIcon: "mr-1",

  // Modal styles
  modal: {
    container: "p-6",
    content: "mb-6 text-base text-gray-700",
    actions: "flex justify-end gap-3",
    button: {
      cancel: "px-4 py-2 rounded-md border text-sm hover:bg-gray-50",
      confirm: "px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
    }
  },

  // Button styles for money donation
  moneyDonationButton: {
    primary: "px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md text-base transition-all duration-200",
    secondary: "px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-md text-base transition-all duration-200"
  },

  // Form layout for money donation
  moneyDonationForm: {
    container: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    actions: "md:col-span-3 flex flex-wrap gap-3 justify-end pt-4 border-t border-gray-200"
  },
  
  // Ledger Form
  ledgerForm: {
    container: "space-y-6",
    grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
    actions: "flex flex-wrap gap-4 justify-end pt-6 border-t border-gray-200",
    advancedSection: "border-t border-gray-200 pt-6",
    advancedGrid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6",
    advancedHeader: "flex items-center justify-between mb-4",
    advancedTitle: "text-lg font-medium text-gray-800",
    balanceText: "text-sm text-gray-600",
    balanceAmount: "font-semibold text-lg",
    newBalance: "mt-2 text-sm",
    newBalancePositive: "text-green-600",
    newBalanceNegative: "text-red-600"
  },

  // Donation Product List Styles
  donationProductList: {
    container: 'w-full p-4 bg-white rounded-lg shadow-sm border border-gray-200',
    logBadge: {
      base: 'px-2 py-1 rounded text-xs font-medium',
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      default: 'bg-gray-100 text-gray-800'
    },
    modalActions: 'mt-4 flex justify-end gap-2',
    modalButton: 'px-3 py-1 rounded text-xs',
    modalButtonPrimary: 'bg-blue-600 text-white',
    modalButtonSecondary: 'border',
    logsContainer: 'max-h-96 overflow-y-auto',
    loadingContainer: 'flex items-center justify-center h-32',
    loadingText: 'text-sm text-muted-foreground',
    logsTable: 'w-full text-sm',
    logsTableHeader: 'border-b',
    logsTableCell: 'p-2 text-left',
    logsTableRow: 'border-b',
    detailsButton: 'px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded',
    deleteButton: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  },

  // Event Form Styles
  eventForm: {
    // Layout
    container: "min-h-screen bg-gray-50 pt-0 pb-6 px-4",
    content: "max-w-6xl mx-auto",
    formGrid: "grid grid-cols-1 lg:grid-cols-2 gap-8",
    dateTimeGrid: "grid grid-cols-1 md:grid-cols-2 gap-6",
    
    // Card
    card: {
      container: "shadow-lg border-0 bg-white rounded-lg",
      header: cn(theme.card.header),
      content: "p-3",
      title: "text-xl font-semibold text-center",
      event: {
        container: "w-full max-w-4xl",
        header: cn(theme.card.header)
      }
    },
    cardContent: "p-6",
    
    // Image Upload
    imageUpload: {
      container: "border-2 border-dashed border-orange-200 rounded-xl p-8 text-center hover:border-orange-400 hover:bg-orange-50/50 transition-all duration-300 group cursor-pointer bg-gray-50/30",
      button: "px-6 py-2.5 text-sm bg-white border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white shadow-sm font-medium transition-all duration-200",
      helpText: "text-xs text-gray-400 mt-3 font-medium"
    },
    
    // Image Preview
    imagePreview: {
      grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6",
      item: "relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200",
      deleteButton: "absolute top-2 right-2 h-8 w-8 bg-white/90 backdrop-blur-sm text-red-500 hover:bg-red-600 hover:text-white rounded-full shadow-md z-10 transition-all duration-200 flex items-center justify-center border border-gray-100",
      image: "w-full aspect-square object-cover bg-gray-100 border-b border-gray-100",
      form: "p-4 space-y-3"
    },
    
    // Action Buttons
    actionButtons: "flex flex-wrap gap-4 justify-end pt-6 border-t border-gray-200",
    cancelButton: "px-5 py-2.5 text-base border hover:bg-gray-50 rounded-md",
    submitButton: "px-5 py-2.5 text-base bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-md"
  },

  // Money Donation List Styles
  moneyDonationList: {
    // Filters section
    filters: {
      container: "bg-white rounded border border-gray-200 p-2 mb-4",
      form: "flex flex-col md:flex-row gap-2 items-center",
      searchContainer: "relative flex-1 w-full",
      searchIcon: "absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none",
      searchIconSvg: "h-4 w-4 text-gray-400",
      searchInput: "block w-full pl-8 pr-2 py-1 border border-gray-300 rounded leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-xs",
      dateContainer: "flex items-center gap-1 w-full md:w-auto",
      dateInput: "px-2 py-1 border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 text-xs",
      dateLabel: "text-gray-600 text-xs",
      buttonContainer: "flex flex-wrap gap-1 w-full md:w-auto",
      button: "px-3 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-violet-500"
    },

    // Table section
    table: {
      container: "bg-white rounded border border-gray-200 overflow-hidden",
      scrollContainer: "overflow-x-auto",
      table: "min-w-full divide-y divide-gray-200",
      thead: "bg-gray-50",
      th: "px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider align-middle",
      thActions: "px-2 w-16",
      thRight: "text-right",
      thCenter: "text-center",
      thLeft: "text-left",
      tbody: "bg-white divide-y divide-gray-200",
      tr: "hover:bg-gray-50",
      td: "px-3 py-2 whitespace-nowrap text-xs text-gray-900",
      tdActions: "px-2 py-2 whitespace-nowrap text-center text-xs font-medium align-middle",
      tdRight: "text-right",
      tdCenter: "text-center",
      loadingCell: "w-full flex items-center justify-center p-8",
      emptyCell: "px-3 py-2 whitespace-nowrap text-xs text-gray-500 text-center"
    },

    // Action buttons
    actionButtons: {
      container: "inline-flex gap-1",
      print: "px-2 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50",
      logs: "px-2 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50",
      edit: "px-2 py-1 border border-gray-300 rounded shadow-sm text-xs font-medium text-blue-700 bg-white hover:bg-gray-50",
      delete: "p-1 rounded text-red-600 hover:bg-red-50",
      deleteDisabled: "p-1 rounded text-gray-400 cursor-not-allowed",
      deleteIcon: "h-4 w-4"
    },

    // Summary section
    summary: {
      container: "px-3 py-2 flex items-center justify-between border-t border-gray-200",
      info: "text-xs text-gray-700",
      total: "flex gap-2 text-xs text-gray-700",
      fontMedium: "font-medium"
    },

    // Context menu
    contextMenu: {
      container: "fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 w-64",
      header: "px-4 py-3 border-b border-gray-200",
      title: "text-sm font-medium text-gray-900",
      subtitle: "text-xs text-gray-500",
      content: "max-h-60 overflow-y-auto p-2",
      item: "flex items-center px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer select-none",
      checkbox: "h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500",
      label: "ml-2 text-sm text-gray-700",
      actions: "flex flex-wrap gap-2 p-2 border-t border-gray-200",
      actionButton: "px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50",
      closeButton: "ml-auto px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
    },

    // Modals
    modal: {
      overlay: "fixed inset-0 z-50 flex items-center justify-center",
      backdrop: "absolute inset-0 bg-black/40",
      container: "relative bg-white rounded shadow-lg w-full max-w-5xl mx-2 p-3",
      header: "flex items-center justify-between mb-2",
      title: "text-sm font-semibold",
      closeButton: "text-xs px-2 py-1 border rounded",
      content: "max-h-[70vh] overflow-y-auto border rounded",
      loading: "p-3 text-xs text-gray-600"
    },

    // Logs table
    logsTable: {
      table: "min-w-full text-xs",
      thead: "bg-gray-50 sticky top-0",
      th: "text-left px-2 py-1",
      tbody: "",
      tr: "border-t align-top",
      td: "px-2 py-1",
      tdCenter: "px-2 py-2 text-center text-gray-500",
      tdNowrap: "px-2 py-1 whitespace-nowrap",
      details: "whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border max-w-[40vw]"
    },

    // Pagination
    pagination: {
      container: "flex items-center justify-between mt-2 text-xs",
      info: "text-gray-700",
      controls: "flex items-center gap-2",
      button: "px-2 py-1 border border-gray-300 rounded shadow-sm text-xs bg-white hover:bg-gray-50"
    }
  }
};

// Page container styles
export const pageContainerStyles = {
  container: "w-full min-h-screen ",
  content: "max-w-7xl mx-auto space-y-4"
};

// Utility functions namespace
export const utils = {
  // Combine class names
  cn: (...classes: (string | undefined)[]) => {
    return classes.filter(Boolean).join(' ');
  },
  
  // Format currency in INR format
  formatINR: (val: number) =>
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0),
    
  // Format amount based on type (credit/debit)
  formatAmount: (val: number, type: 'credit' | 'debit') =>
    type === 'debit' 
      ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(val || 0))
      : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)
};

// Calendar and Moon Phase styles
export const calendarStyles = {
  // Main container
  container: 'space-y-6',
  
  // Calendar header
  header: {
    container: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6',
    nav: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
    monthNav: 'flex items-center gap-2',
    navButton: 'p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors',
    monthText: 'text-xl font-semibold text-gray-800',
    actions: 'flex flex-wrap items-center gap-3',
    todayButton: 'px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors',
    jumpContainer: 'flex items-center gap-2',
    jumpInput: 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    jumpButton: 'px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors disabled:opacity-50'
  },
  
  // Calendar content
  content: 'mt-4',
  
  // Selected date info
  selectedDate: {
    container: 'mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg',
    date: 'text-gray-900',
    time: 'text-gray-700',
    phase: 'mt-2 inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium'
  },
  
  // Time picker - consolidated
  timePicker: {
    container: 'mt-6',
    label: 'block text-sm font-medium text-gray-700 mb-2',
    input: 'block w-full rounded-lg border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    // Additional time picker styles
    timeInput: 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500'
  },
  
  // Saved dates section
  savedDates: {
    container: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6',
    header: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4',
    title: 'text-lg font-semibold text-gray-800',
    actions: 'flex flex-wrap gap-2',
    saveButton: 'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
    exportButton: 'px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50',
    rangeButton: 'px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition-colors',
    deleteButton: 'px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors',
    list: 'border-t border-gray-200 pt-4',
    emptyState: 'text-center py-12 border-2 border-dashed border-gray-300 rounded-lg',
    emptyIcon: 'mx-auto h-12 w-12 text-gray-400',
    emptyText: 'mt-4 text-gray-500',
    emptySubtext: 'text-sm text-gray-400 mt-1'
  },
  
  // Moon phases section
  moonPhases: {
    container: 'bg-white rounded-xl shadow-sm border border-gray-200 p-6',
    title: 'text-lg font-semibold text-gray-800 mb-4',
    list: 'space-y-2',
    phaseItem: 'flex items-center gap-3',
    phaseColor: 'w-4 h-4 rounded-full',
    phaseName: 'text-sm text-gray-700',
    phaseIcon: 'text-xs text-gray-500 ml-auto'
  },
  
  // Tips section
  tips: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200',
  tipsTitle: 'font-medium text-blue-900 mb-2',
  tipsText: 'text-sm text-blue-800',
  
  // Modal
  modal: {
    container: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
    content: 'bg-white rounded-xl shadow-2xl w-full max-w-md p-6',
    title: 'text-lg font-semibold text-gray-900 mb-4',
    input: 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6',
    actions: 'flex gap-3',
    cancelButton: 'flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors',
    saveButton: 'flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors'
  },
  
  // Moon phase indicators
  moonPhase: {
    new: 'bg-red-100 text-red-800',
    firstQuarter: 'bg-blue-100 text-blue-800',
    full: 'bg-purple-100 text-purple-800',
    lastQuarter: 'bg-green-100 text-green-800',
    icon: 'text-lg mr-1',
    label: 'text-xs font-medium'
  },
  
  // Calendar day picker
  dayPicker: {
    container: 'w-full',
    caption: 'flex justify-between items-center py-2 px-4',
    button: 'p-1 rounded hover:bg-gray-100',
    table: 'w-full border-collapse',
    head: 'border-b',
    headCell: 'text-gray-500 font-medium py-2 text-center text-xs',
    cell: 'p-0 border',
    day: 'w-10 h-10 mx-auto flex items-center justify-center rounded-full hover:bg-gray-100',
    selected: 'bg-orange-500 text-white hover:bg-orange-600',
    today: 'font-bold border-2 border-blue-500',
    disabled: 'text-gray-300',
    outside: 'text-gray-300',
    range: {
      start: 'rounded-l-full',
      end: 'rounded-r-full',
      middle: 'bg-blue-50',
    },
  },
  
  // Modifiers - consolidated
  modifiers: {
    today: 'font-bold border-2 border-blue-500',
    selected: 'relative bg-orange-500 text-white',
    saved: 'bg-green-50 border border-green-200',
    range: 'bg-blue-100',
    rangeStart: 'rounded-l-full',
    rangeEnd: 'rounded-r-full',
  }
};

// Re-export utilities from theme.ts for backward compatibility
export { cn } from './theme';
export const { formatINR, formatAmount } = utils;
