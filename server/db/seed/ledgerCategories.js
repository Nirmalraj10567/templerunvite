const categories = [
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

module.exports = {
  async seed(db) {
    for (const category of categories) {
      await db.query(
        'INSERT INTO ledger_categories (value, label) VALUES ($1, $2) ON CONFLICT (value) DO NOTHING',
        [category.value, category.label]
      );
    }
  }
};
