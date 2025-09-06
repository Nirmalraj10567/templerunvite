export const ledgerCategories = [
  // Income Categories
  { value: 'donation', label: 'Donation' },
  { value: 'ticket_sales', label: 'Ticket Sales' },
  { value: 'sponsorship', label: 'Sponsorship' },
  { value: 'interest', label: 'Interest Income' },
  
  // Expense Categories
  { value: 'event_expenses', label: 'Event Expenses' },
  { value: 'food', label: 'Food & Beverages' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'printing', label: 'Printing' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  
  // Asset Categories
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank Account' },
  { value: 'equipment', label: 'Equipment' },
  
  // Liability Categories
  { value: 'loan', label: 'Loan' },
  { value: 'credit', label: 'Credit' },
];

export const getCategoryLabel = (value: string) => {
  const category = ledgerCategories.find(cat => cat.value === value);
  return category ? category.label : value;
};
