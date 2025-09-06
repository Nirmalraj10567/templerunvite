"use client";

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type Row = { id: number; village: string; group: string };

export default function AmmavasaiEditPage() {
  const { language } = useLanguage();

  const t = {
    tamil: {
      header: 'அமாவாசை நாள் பதிவு',
      subtitle: 'Ammavasai Edit',
      date: 'நாள்',
      villageName: 'ஊர் பெயர்',
      groupName: 'குழு பெயர்',
      slNo: 'வ.எண்',
      village: 'ஊர் பெயர்',
      group: 'குழு பெயர்',
      save: 'பதிவு',
      exit: 'வெளியே'
    },
    english: {
      header: 'Ammavasai Day Entry',
      subtitle: 'அமாவாசை நாள் பதிவு',
      date: 'Date',
      villageName: 'Village Name',
      groupName: 'Group Name',
      slNo: 'Sl. No.',
      village: 'Village',
      group: 'Group',
      save: 'Save',
      exit: 'Exit'
    }
  } as const;

  const [date, setDate] = useState('2025-08-09');
  const [villageName, setVillageName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [rows, setRows] = useState<Row[]>([{ id: 1, village: '', group: '' }]);

  const addRow = () => setRows(prev => [...prev, { id: (prev.at(-1)?.id || 0) + 1, village: '', group: '' }]);
  const updateRow = (id: number, field: keyof Row, value: string) => setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Ammavasai saved', { date, villageName, groupName, rows });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 rounded-t-lg shadow-lg">
        <h1 className="text-xl font-bold text-center">{t[language].header}</h1>
        <p className="text-center text-orange-100 mt-1 text-sm">{t[language].subtitle}</p>
      </div>

      {/* Form */}
      <div className="bg-white/80 backdrop-blur-sm p-6 border border-orange-200 shadow-lg rounded-lg mt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-3">
            <label className="w-16 text-sm font-medium text-gray-700">{t[language].date}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3">
              <label className="w-24 text-sm font-medium text-gray-700">{t[language].villageName}</label>
              <input type="text" value={villageName} onChange={(e) => setVillageName(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
            </div>
            <div className="flex items-center space-x-3">
              <label className="w-24 text-sm font-medium text-gray-700">{t[language].groupName}</label>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
            </div>
          </div>

          {/* Table */}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border border-gray-200">
              <thead>
                <tr className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm">
                  <th className="px-2 py-2 text-left border-r border-orange-400">{t[language].slNo}</th>
                  <th className="px-2 py-2 text-left border-r border-orange-400">{t[language].village}</th>
                  <th className="px-2 py-2 text-left">{t[language].group}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-200">
                    <td className="px-2 py-2 border-r border-gray-200 text-sm">{r.id}</td>
                    <td className="px-2 py-2 border-r border-gray-200 text-sm">
                      <input value={r.village} onChange={(e) => updateRow(r.id, 'village', e.target.value)} className="w-full px-2 py-1 border rounded" />
                    </td>
                    <td className="px-2 py-2 text-sm">
                      <input value={r.group} onChange={(e) => updateRow(r.id, 'group', e.target.value)} className="w-full px-2 py-1 border rounded" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right mt-2">
              <button type="button" onClick={addRow} className="px-4 py-1.5 bg-white border border-orange-300 rounded-lg text-sm hover:bg-orange-50">+ Row</button>
            </div>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="bg-white/80 backdrop-blur-sm p-4 border border-orange-200 rounded-lg shadow-lg mt-6">
        <div className="flex justify-end space-x-3">
          <button type="submit" onClick={handleSubmit} className="px-8 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white border border-orange-400 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all duration-200 font-medium shadow-md hover:shadow-lg">
            {t[language].save}
          </button>
          <button className="px-8 py-2.5 bg-gray-300 text-gray-700 border border-gray-400 rounded-lg hover:bg-gray-400 transition-colors duration-200 font-medium">
            {t[language].exit}
          </button>
        </div>
      </div>
    </div>
  );
}
