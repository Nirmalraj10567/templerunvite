// Centralized Theme System for Temple Management
// Change values here to update ALL pages automatically

export const theme = {
  // Primary Colors
  colors: {
    primary: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316', // Main orange
      600: '#ea580c',
      700: '#c2410c',
    },
    secondary: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main red
      600: '#dc2626',
      700: '#b91c1c',
    },
    error: '#ef4444',
    success: '#22c55e',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      700: '#374151',
      800: '#1f2937',
    }
  },

  // Gradients - EXACT from AnnadhanamEntryPage.tsx
  gradients: {
    // CardHeader: from-orange-500 to-orange-600 (older orange gradient)
    header: 'bg-gradient-to-r from-orange-500 to-orange-600',
    headerHover: 'hover:from-orange-600 hover:to-orange-700',
    // Page background: from-orange-50 via-red-50 to-yellow-50 (includes yellow!)
    pageBackground: 'bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50',
    // Buttons: from-orange-500 to-red-600
    button: 'bg-gradient-to-r from-orange-500 to-red-600',
    buttonHover: 'hover:from-orange-600 hover:to-red-700',
  },

  // Input Styles - EXACT from AnnadhanamEntryPage.tsx
  input: {
    // Full input style with ALL focus states as in AnnadhanamEntryPage.tsx - SINGLE LINE
    //base: 'border-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200',
    base: 'border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200',
    withIcon: 'pl-10',
    withoutIcon: 'pl-4',
    error: 'border-red-500',
    readOnly: 'bg-gray-50',
    // Complete with all padding options - SINGLE LINE
    complete: 'pl-10 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200',
    // Text field sizes (height and text size only, padding handled by withIcon/withoutIcon)
    size: {
      sm: 'h-8 text-sm',
      md: 'h-10 text-base',
      lg: 'h-12 text-lg',
    },
  },

  // Select Styles - EXACT from AnnadhanamEntryPage.tsx
  select: {
    base: 'w-full pl-10 pr-10 py-2 border border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none appearance-none bg-white shadow-sm focus:shadow-md transition-all duration-200',
    error: 'border-red-500',
    // Dropdown sizes (height and text size only)
    size: {
      sm: 'h-8 text-sm',
      md: 'h-10 text-base',
      lg: 'h-12 text-lg',
    },
  },

  // Textarea Styles
  textarea: {
    base: 'w-full px-4 py-2 border border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none bg-white shadow-sm focus:shadow-md transition-all duration-200',
    error: 'border-red-500',
    // Textarea sizes (min-height and text size)
    size: {
      sm: 'min-h-[80px] text-sm',
      md: 'min-h-[120px] text-base',
      lg: 'min-h-[160px] text-lg',
    },
  },

  // Checkbox Styles
  checkbox: {
    base: 'h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-500',
    // Checkbox sizes
    size: {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    },
  },

  // Calendar Styles
  calendar: {
    base: 'border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none',
    // Calendar sizes (height and text size)
    size: {
      sm: 'h-8 text-sm',
      md: 'h-10 text-base',
      lg: 'h-12 text-lg',
    },
  },

  // Switch Styles
  switch: {
    base: 'peer-focus:ring-2 peer-focus:ring-orange-500 peer-focus:ring-offset-2',
    // Switch sizes
    size: {
      sm: 'h-5 w-9',
      md: 'h-6 w-11',
      lg: 'h-7 w-13',
    },
  },

  // Tabs Styles
  tabs: {
    base: 'border-b border-gray-200',
    trigger: 'px-4 py-2 text-sm font-medium text-gray-600 hover:text-orange-600 data-[state=active]:text-orange-600 data-[state=active]:border-b-2 data-[state=active]:border-orange-600',
    // Tabs sizes (padding and text size)
    size: {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    },
  },

  // Button Styles - EXACT from AnnadhanamEntryPage.tsx
  button: {
    primary: 'px-8 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium',
    secondary: 'px-4 py-2 border border-orange-300 text-orange-700 hover:bg-orange-50 transition-all duration-200',
    danger: 'px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all duration-200',
  },

  // Card Styles
  card: {
    container: 'shadow-lg border-0 bg-white rounded-lg',
    header: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-6 rounded-t-lg',
    content: 'p-6',
  },

  // Icon Styles
  icon: {
    size: 'w-4 h-4',
    position: 'absolute left-3 top-1/2 transform -translate-y-1/2',
    color: 'text-gray-400',
  },

  // Header Styles - EXACT from AnnadhanamEntryPage.tsx
  header: {
    // Complete header styling from CardHeader
    container: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-6 rounded-t-lg',
    // Text sizes
    main: 'text-xl font-bold',
    secondary: 'text-lg font-bold',
    // Icon size
    icon: 'w-5 h-5',
    // Spacing for header content
    contentSpacing: 'flex items-center justify-between',
    // Badge styling
    badge: 'flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full',
  },

  // Layout
  layout: {
    pageBackground: 'min-h-screen bg-gradient-to-br from-orange-50 to-red-50',
    container: 'max-w-7xl mx-auto px-4 py-6',
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    fieldGap: 'gap-6',
  },

  // Validation
  validation: {
    errorText: 'text-red-500 text-xs mt-1',
    errorBorder: 'border-red-500',
    requiredIndicator: '*',
  },

  // Sidebar Styles
  sidebar: {
    // Main sidebar container
    container: 'bg-gradient-to-b from-gray-900 to-black text-white shadow-xl',
    containerDark: 'bg-gradient-to-b from-gray-900 to-black text-white shadow-xl',
     //container: 'bg-gradient-to-b from-orange-600 to-orange-700 text-white shadow-xl',
   // containerDark: 'bg-gradient-to-b from-gray-800 to-gray-900 text-white shadow-xl',
    // Sidebar navigation items
    navItem: {
       //base: 'flex items-center px-4 py-3 text-white rounded-lg transition-all duration-200 hover:bg-orange-500 hover:shadow-md',
      //active: 'bg-orange-500 shadow-md border-l-4 border-white',
      //hover: 'hover:bg-orange-500 hover:shadow-md',
      base: 'flex items-center px-4 py-3 text-white rounded-lg transition-all duration-200 hover:bg-gray-800 hover:shadow-md',
      active: 'bg-gray-800 shadow-md border-l-4 border-white',
      hover: 'hover:bg-gray-800 hover:shadow-md',
      icon: 'w-5 h-5 mr-3 text-white',
      text: 'text-white font-medium',
    },
    
    // Sidebar sections/groups
    section: {
       //header: 'px-4 py-2 text-xs font-semibold text-orange-200 uppercase tracking-wider',
      //divider: 'border-orange-500 border-t my-2',
      header: 'px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider',
      divider: 'border-gray-700 border-t my-2',
      container: 'space-y-1',
    },
    
    // Sidebar footer
    footer: {
      //container: 'absolute bottom-0 left-0 right-0 p-4 border-t border-orange-500',
      //text: 'text-orange-200 text-xs',
      container: 'absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700',
      text: 'text-gray-400 text-xs',
    },
    
    // Sidebar toggle button (mobile)
    toggle: {
      //button: 'p-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition-colors',
      button: 'p-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors',
      icon: 'w-6 h-6',
    },
    
    // Sidebar colors for different states
    colors: {
      // background: 'bg-gradient-to-b from-orange-600 to-orange-700',
      // backgroundDark: 'bg-gradient-to-b from-gray-800 to-gray-900',
      // itemHover: 'hover:bg-orange-500',
      // itemActive: 'bg-orange-500',
      //
      background: 'bg-gradient-to-b from-gray-900 to-black',
      backgroundDark: 'bg-gradient-to-b from-gray-900 to-black',
      itemHover: 'hover:bg-gray-800',
      itemActive: 'bg-gray-800',
      text: 'text-white',
      //  textMuted: 'text-orange-200',
      // border: 'border-orange-500',
      textMuted: 'text-gray-400',
      border: 'border-gray-700',
      icon: 'text-white',
    },
  },

  // Spacing
  spacing: {
    fieldGap: 'gap-6',
    errorMargin: 'mt-1',
    inputPadding: {
      withIcon: 'pl-10',
      withoutIcon: 'pl-4',
    },
  },
};

// Helper function to combine classes
export const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ').trim();
};

// Pre-computed common class combinations
export const inputClasses = {
  base: cn(theme.input.base),
  withIcon: cn(theme.input.base, theme.input.withIcon),
  withoutIcon: cn(theme.input.base, theme.input.withoutIcon),
  error: cn(theme.input.base, theme.input.error),
  readOnly: cn(theme.input.base, theme.input.readOnly),
};

export const buttonClasses = {
  primary: cn(theme.button.primary),
  secondary: cn(theme.button.secondary),
  danger: cn(theme.button.danger),
};

export const cardClasses = {
  container: cn(theme.card.container),
  header: cn(theme.card.header),
  content: cn(theme.card.content),
};

export const sidebarClasses = {
  container: cn(theme.sidebar.container),
  containerDark: cn(theme.sidebar.containerDark),
  navItem: cn(theme.sidebar.navItem.base),
  navItemActive: cn(theme.sidebar.navItem.base, theme.sidebar.navItem.active),
  navItemHover: cn(theme.sidebar.navItem.base, theme.sidebar.navItem.hover),
  sectionHeader: cn(theme.sidebar.section.header),
  sectionDivider: cn(theme.sidebar.section.divider),
  footer: cn(theme.sidebar.footer.container),
  toggleButton: cn(theme.sidebar.toggle.button),
};

export default theme;
