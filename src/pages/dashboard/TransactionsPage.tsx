import React from 'react';

export default function TransactionsPage() {
  const transactions = [
    { id: 'TXN-1001', type: 'Donation', amount: '₹2,500', via: 'UPI', by: 'Ravi', date: '2025-08-12' },
    { id: 'TXN-1002', type: 'Donation', amount: '₹5,000', via: 'Cash', by: 'Anita', date: '2025-08-13' },
    { id: 'TXN-1003', type: 'Expense', amount: '₹1,200', via: 'Bank', by: 'Temple Decor', date: '2025-08-14' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-orange-900">Transactions</h2>
      <div className="overflow-x-auto rounded-xl border border-orange-100 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-orange-50 text-orange-900">
            <tr>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Method</th>
              <th className="text-left px-4 py-3">By/To</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, idx) => (
              <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/30'}>
                <td className="px-4 py-3 font-medium text-gray-800">{t.id}</td>
                <td className="px-4 py-3">{t.type}</td>
                <td className="px-4 py-3 text-orange-700 font-semibold">{t.amount}</td>
                <td className="px-4 py-3">{t.via}</td>
                <td className="px-4 py-3">{t.by}</td>
                <td className="px-4 py-3">{t.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
