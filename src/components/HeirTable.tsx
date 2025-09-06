import React from 'react';
import { Heir } from '@/types';

type HeirTableProps = {
  heirs: Heir[];
  masterRaces: {value: string; label: string; tamil: string}[];
  errors: Record<string, string>;
  onUpdate: (id: string, field: keyof Heir, value: string) => void;
  onRemove: (id: string) => void;
  language: 'tamil' | 'english';
};

export default function HeirTable({
  heirs,
  masterRaces,
  errors,
  onUpdate,
  onRemove,
  language
}: HeirTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300 rounded text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">
              {language === 'tamil' ? 'வ.எண்' : 'S.No.'}
            </th>
            <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">
              {language === 'tamil' ? 'பெயர்' : 'Name'}
            </th>
            <th className="px-2 py-1 text-left font-medium text-gray-900 border-b">
              {language === 'tamil' ? 'இனம்' : 'Race'}
            </th>
            <th className="px-2 py-1 text-center font-medium text-gray-900 border-b">
              {language === 'tamil' ? 'செயல்' : 'Action'}
            </th>
          </tr>
        </thead>
        <tbody>
          {heirs.map((heir, index) => (
            <tr key={heir.id} className="hover:bg-gray-50">
              <td className="px-2 py-1 text-center border-b">{heir.serialNumber}</td>
              <td className="px-2 py-1 border-b">
                <input
                  type="text"
                  value={heir.name}
                  onChange={(e) => onUpdate(heir.id, 'name', e.target.value)}
                  className={`w-full px-1 py-0.5 text-xs border rounded ${errors[`heir_${index}_name`] ? 'border-red-300' : 'border-gray-300'}`}
                />
              </td>
              <td className="px-2 py-1 border-b">
                <select
                  value={heir.race}
                  onChange={(e) => onUpdate(heir.id, 'race', e.target.value)}
                  className={`w-full px-1 py-0.5 text-xs border rounded ${errors[`heir_${index}_race`] ? 'border-red-300' : 'border-gray-300'}`}
                >
                  <option value="">{language === 'tamil' ? 'தேர்ந்தெடு' : 'Select'}</option>
                  {masterRaces.map((race) => (
                    <option key={race.value} value={race.value}>
                      {language === 'tamil' ? race.tamil : race.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-1 text-center border-b">
                <button 
                  onClick={() => onRemove(heir.id)}
                  className="text-red-600 hover:text-red-900 p-1"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
