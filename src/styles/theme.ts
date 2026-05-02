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
    base: 'border border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200',
    withIcon: 'pl-10',
    withoutIcon: 'pl-4',
    error: 'border-red-500',
    readOnly: 'bg-gray-50',
    // Complete with all padding options - SINGLE LINE
    complete: 'pl-10 border border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none shadow-sm focus:shadow-md transition-all duration-200',
    // Text field sizes (height and text size only, padding handled by withIcon/withoutIcon)
    size: {
      sm: 'h-8 text-sm',
      md: 'h-10 text-base',
      lg: 'h-12 text-lg',
    },
  },

  // Select Styles - EXACT from AnnadhanamEntryPage.tsx
  select: {
    base: 'w-full pl-10 pr-10 py-2 border border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:outline-none appearance-none bg-white text-gray-900 shadow-sm focus:shadow-md transition-all duration-200',
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
    // Filter button
    filter: 'px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md font-medium',
    filterActive: 'px-4 py-2 bg-orange-500 border border-orange-600 text-white hover:bg-orange-600 transition-all duration-200 shadow-sm hover:shadow-md font-medium',
    // PDF export button
    pdf: 'px-4 py-2 bg-red-500 border border-red-600 text-white hover:bg-red-600 transition-all duration-200 shadow-sm hover:shadow-md font-medium flex items-center gap-2',
    // CSV export button
    csv: 'px-4 py-2 bg-green-500 border border-green-600 text-white hover:bg-green-600 transition-all duration-200 shadow-sm hover:shadow-md font-medium flex items-center gap-2',
    // Action buttons for tables
    action: 'px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150',
    actionPrimary: 'bg-orange-500 text-white hover:bg-orange-600',
    actionSecondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    actionDanger: 'bg-red-500 text-white hover:bg-red-600',
    actionSuccess: 'bg-emerald-600 text-white hover:bg-emerald-700',
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

  // Table Styles
  table: {
    // Table container
    container: 'w-full border-collapse',
    wrapper: 'overflow-x-auto rounded-lg shadow-sm',

    // Table container with horizontal scroll support
    scrollContainer: 'w-full overflow-x-auto',
    scrollContainerWrapper: 'w-full border border-gray-200 rounded-lg shadow-sm',
    tableContainer: 'px-6 pt-6',

    // Outer container size for responsive tables
    outerContainer: 'w-full',
    outerContainerSmall: 'w-full max-w-2xl',
    outerContainerMedium: 'w-full max-w-4xl',
    outerContainerLarge: 'w-full max-w-6xl',
    outerContainerFull: 'w-full max-w-full',

    // Table header
    header: 'bg-gradient-to-r from-orange-100 to-orange-200 text-gray-800',
    headerCell: 'px-4 py-0 text-left text-xs font-semibold uppercase tracking-wider leading-none h-8',
    headerCellSno: 'px-3 py-0 text-center text-xs font-semibold uppercase tracking-wider w-16 leading-none h-8',

    // Table rows
    row: 'border-b border-gray-200 hover:bg-orange-50 transition-colors duration-150 h-8',
    rowEven: 'bg-gray-50 h-8',
    rowOdd: 'bg-white h-8',
    rowHover: 'hover:bg-orange-50',

    // Table cells
    cell: 'px-4 py-0 text-xs text-gray-700 leading-none align-middle h-8',
    cellHeader: 'px-4 py-0 text-left text-xs font-semibold text-gray-700 bg-gray-100 border-b border-gray-300 leading-none align-middle h-8',
    cellSno: 'px-3 py-0 text-center text-xs text-gray-700 w-16 leading-none align-middle h-8',

    // Table borders
    border: 'border border-gray-200',
    borderOuter: 'border border-gray-300 rounded-lg',

    // Table sizes
    size: {
      sm: {
        cell: 'px-3 py-2 text-xs',
        headerCell: 'px-3 py-2 text-xs',
      },
      md: {
        cell: 'px-4 py-3 text-sm',
        headerCell: 'px-4 py-3 text-sm',
      },
      lg: {
        cell: 'px-6 py-4 text-base',
        headerCell: 'px-6 py-4 text-base',
      },
    },

    // Table variants
    variant: {
      default: 'border border-gray-200',
      striped: 'border border-gray-200',
      bordered: 'border border-gray-300',
      hover: 'border border-gray-200',
    },

    // Action buttons in table
    actionCell: 'px-4 py-3 text-right',
    actionButton: 'px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150',
    actionButtonPrimary: 'bg-orange-500 text-white hover:bg-orange-600',
    actionButtonSecondary: 'bg-gray-200 text-gray-700 hover:bg-gray-300',
    actionButtonDanger: 'bg-red-500 text-white hover:bg-red-600',

    // Status badges
    statusBadge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    statusSuccess: 'bg-green-100 text-green-800',
    statusWarning: 'bg-yellow-100 text-yellow-800',
    statusError: 'bg-red-100 text-red-800',
    statusInfo: 'bg-blue-100 text-blue-800',

    // Empty state
    emptyState: 'px-4 py-8 text-center text-gray-500',
    emptyIcon: 'w-12 h-12 mx-auto mb-2 text-gray-400',

    // Pagination
    pagination: 'flex items-center justify-between px-4 py-3 border-t border-gray-200',
    paginationButton: 'px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500',
    paginationButtonActive: 'px-3 py-1 text-sm bg-orange-500 text-white border border-orange-500 rounded-md',
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
  filter: cn(theme.button.filter),
  filterActive: cn(theme.button.filterActive),
  pdf: cn(theme.button.pdf),
  csv: cn(theme.button.csv),
  action: cn(theme.button.action),
  actionPrimary: cn(theme.button.action, theme.button.actionPrimary),
  actionSecondary: cn(theme.button.action, theme.button.actionSecondary),
  actionDanger: cn(theme.button.action, theme.button.actionDanger),
  actionSuccess: cn(theme.button.action, theme.button.actionSuccess),
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

export const tableClasses = {
  container: cn(theme.table.container),
  wrapper: cn(theme.table.wrapper),
  scrollContainer: cn(theme.table.scrollContainer),
  scrollContainerWrapper: cn(theme.table.scrollContainerWrapper),
  outerContainer: cn(theme.table.outerContainer),
  outerContainerSmall: cn(theme.table.outerContainerSmall),
  outerContainerMedium: cn(theme.table.outerContainerMedium),
  outerContainerLarge: cn(theme.table.outerContainerLarge),
  outerContainerFull: cn(theme.table.outerContainerFull),
  header: cn(theme.table.header),
  headerCell: cn(theme.table.headerCell),
  headerCellSno: cn(theme.table.headerCellSno),
  row: cn(theme.table.row),
  rowEven: cn(theme.table.rowEven),
  rowOdd: cn(theme.table.rowOdd),
  rowHover: cn(theme.table.rowHover),
  cell: cn(theme.table.cell),
  cellHeader: cn(theme.table.cellHeader),
  cellSno: cn(theme.table.cellSno),
  border: cn(theme.table.border),
  borderOuter: cn(theme.table.borderOuter),
  actionCell: cn(theme.table.actionCell),
  actionButton: cn(theme.table.actionButton),
  actionButtonPrimary: cn(theme.table.actionButton, theme.table.actionButtonPrimary),
  actionButtonSecondary: cn(theme.table.actionButton, theme.table.actionButtonSecondary),
  actionButtonDanger: cn(theme.table.actionButton, theme.table.actionButtonDanger),
  statusBadge: cn(theme.table.statusBadge),
  statusSuccess: cn(theme.table.statusBadge, theme.table.statusSuccess),
  statusWarning: cn(theme.table.statusBadge, theme.table.statusWarning),
  statusError: cn(theme.table.statusBadge, theme.table.statusError),
  statusInfo: cn(theme.table.statusBadge, theme.table.statusInfo),
  emptyState: cn(theme.table.emptyState),
  emptyIcon: cn(theme.table.emptyIcon),
  pagination: cn(theme.table.pagination),
  paginationButton: cn(theme.table.paginationButton),
  paginationButtonActive: cn(theme.table.paginationButtonActive),
};

export default theme;
