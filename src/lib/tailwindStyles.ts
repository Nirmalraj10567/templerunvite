// src/lib/tailwindStyles.ts

export const card = "bg-white rounded-lg border border-gray-200 shadow-sm";
export const input =
  "w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
export const button =
  "px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1";
export const primaryButton =
  "px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1";
export const dangerButton =
  "px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1";
export const tableHeader =
  "px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 text-left";
export const tableCell =
  "px-3 py-2 text-xs text-gray-900 whitespace-nowrap";
export const tableCellCenter = "px-2 py-2 text-center";
export const tableRowHover = "hover:bg-gray-50";
export const modalTitle = "text-base font-semibold text-gray-900";
export const label = "block text-xs text-gray-600 mb-1";
export const contextMenuItem =
  "flex items-center px-2.5 py-1.5 text-sm text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer";
export const badge = (action: string) => {
  switch (action) {
    case 'create': return "px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded";
    case 'update': return "px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded";
    case 'delete': return "px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded";
    default: return "px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded";
  }
};