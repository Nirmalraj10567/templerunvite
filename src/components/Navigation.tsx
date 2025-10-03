import { Link } from 'react-router-dom';
import { useHasPermission } from '@/contexts/AuthContext';

export function Navigation() {
  const has = useHasPermission();
  const canCreateRegistration = has('user_registrations', 'edit');
  const canViewTax = has('tax_registrations', 'view');
  const canEditTax = has('tax_registrations', 'edit');
  const canViewProperties = has('property_registrations', 'view');
  const canEditProperties = has('property_registrations', 'edit');
  const canViewDonations = has('donations', 'view');
  const canEditDonations = has('donations', 'edit');

  return (
    <nav className="flex flex-wrap gap-3 p-2 bg-gray-50 border-b text-sm">
      <Link className="underline" to="/">Home</Link>
      <Link className="underline" to="/dashboard/members">Members</Link>
      <span className="text-gray-400">|</span>

      {(canViewDonations || canEditDonations) && (
        <>
          {canViewDonations && (
            <Link className="font-semibold text-blue-700 underline" to="/dashboard/donation-product/list">Donations - List</Link>
          )}
          {canEditDonations && (
            <Link className="font-semibold text-blue-700 underline" to="/dashboard/donation-product/entry">Donations - Entry</Link>
          )}
          <span className="text-gray-400">|</span>
        </>
      )}

      {canCreateRegistration && (
        <>
          <Link className="font-semibold text-green-700 underline" to="/dashboard/registrations/text-entry">Registrations - Text Entry</Link>
          <span className="text-gray-400">|</span>
        </>
      )}

      {(canViewTax || canEditTax) && (
        <>
         {canViewTax && (
            <Link className="font-semibold text-teal-700 underline" to="/dashboard/tax/list">Tax - List</Link>
          )}
          {canEditTax && (
            <Link className="font-semibold text-teal-700 underline" to="/dashboard/tax/entry">Tax - Entry</Link>
          )}
          {canEditTax && (
            <Link className="font-semibold text-blue-700 underline" to="/dashboard/registrations/list">Tax - list</Link>
          )}
          {canEditTax && (
            <Link className="font-semibold text-blue-700 underline" to="/dashboard/tax/settings">Tax - Settings</Link>
          )}
          
          <span className="text-gray-400">|</span>
        </>
      )}

      <Link className="font-semibold text-orange-700 underline" to="/dashboard/hall/entry">Hall Entry</Link>
      <Link className="font-semibold text-orange-700 underline" to="/dashboard/registrations/list">Registrations - List</Link>
      <Link className="font-semibold text-orange-700 underline" to="/dashboard/hall/list">Hall List</Link>
      <span className="text-gray-400">|</span>
      <Link className="font-semibold text-purple-700 underline" to="/dashboard/kanikalar">Kanikalar</Link>
      
      {(canViewProperties || canEditProperties) && (
        <>
          <span className="text-gray-400">|</span>
          <Link className="font-semibold text-indigo-700 underline" to="/dashboard/properties">Properties</Link>
          {canEditProperties && (
            <Link className="font-semibold text-indigo-600 underline" to="/dashboard/properties/new">+ New</Link>
          )}
        </>
      )}
    </nav>
  );
}
