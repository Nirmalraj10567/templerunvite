import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { theme } from '@/styles/theme';
import { cn } from '@/lib/utils';

type Registration = {
  id: number;
  receipt_number: string;
  date: string;
  name: string;
  mobile_number: string;
  father_name: string;
  address: string;
  postal_code: string;
  education: string;
  occupation: string;
  aadhaar_number: string;
  clan: string;
  group: string;
  male_heirs: number;
  female_heirs: number;
  amount: number;
  amount_paid: number;
  donation: number;
  total_amount: number;
  outstanding_amount: number;
  created_at: string;
  // Family chain fields
  gender?: string;
  marital_status?: string;
  parent_reference_id?: string;
  family_head_reference?: string;
  relationship_type?: string;
  reference_number?: string;
  village?: string;
};

export default function RegistrationListView() {
  const { token } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<'all' | 'family'>('all');
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search,
      });

      const response = await fetch(`https://tmsapi.xesstechlink.com/api/registrations?${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }

      const data = await response.json();
      setRegistrations(data.data || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [page, pageSize, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchRegistrations();
  };

  const handleViewDetails = (registration: Registration) => {
    setSelectedRegistration(registration);
    setIsModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return 'N/A';
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleExportPDF = async (registration: Registration) => {
    setIsGeneratingPdf(true);
    try {
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/registrations/${registration.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'PDF generation failed on server.' }));
        throw new Error(errorData.error);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registration_${registration.receipt_number || registration.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert(`Failed to export PDF: ${error.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const handleExportAllPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await fetch('https://tmsapi.xesstechlink.com/api/registrations/export-pdf', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Bulk PDF generation failed on server.' }));
        throw new Error(errorData.error);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all_registrations.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting all PDFs:', error);
      alert(`Failed to export all PDFs: ${error.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filter and sort registrations based on family filter
  const filteredRegistrations = useMemo(() => {
    let filtered = registrations;
    
    // Filter by family chain
    if (familyFilter === 'family') {
      filtered = registrations.filter(r => r.parent_reference_id || r.family_head_reference || r.relationship_type);
    }
    
    // Sort based on filter mode
    if (familyFilter === 'family') {
      // Family mode: sort by family hierarchy
      filtered = [...filtered].sort((a, b) => {
        const aIsHead = a.reference_number && a.family_head_reference === a.reference_number;
        const bIsHead = b.reference_number && b.family_head_reference === b.reference_number;
        if (aIsHead && !bIsHead) return -1;
        if (!aIsHead && bIsHead) return 1;
        const aParent = a.parent_reference_id || '';
        const bParent = b.parent_reference_id || '';
        return String(aParent).localeCompare(String(bParent)) || String(a.name).localeCompare(String(b.name));
      });
    } else {
      // All mode: sort by reference number desc
      filtered = [...filtered].sort((a, b) => {
        const refA = a.reference_number || a.receipt_number || '';
        const refB = b.reference_number || b.receipt_number || '';
        return String(refB).localeCompare(String(refA));
      });
    }
    
    return filtered;
  }, [registrations, familyFilter]);

  if (loading && registrations.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Registration List</h1>
        
        {/* Search Bar & Filters */}
        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by name, mobile, or receipt number..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>
          </form>
          
          {/* Family Chain Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <div className="flex items-center gap-1 bg-purple-50 rounded p-1 border border-purple-200">
              <button
                onClick={() => setFamilyFilter('all')}
                className={`px-3 py-1 rounded text-sm transition-colors ${familyFilter === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'bg-transparent text-purple-700 hover:text-purple-900'}`}
              >
                All Users
              </button>
              <button
                onClick={() => setFamilyFilter('family')}
                className={`px-3 py-1 rounded text-sm transition-colors ${familyFilter === 'family' ? 'bg-purple-600 text-white shadow-sm' : 'bg-transparent text-purple-700 hover:text-purple-900'}`}
              >
                👨‍👩‍👧‍👦 Family Chain
              </button>
            </div>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Family Chain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    {familyFilter === 'family' ? 'No family chain members found. Create tax registrations with family links.' : 'No registrations found.'}
                  </td>
                </tr>
              ) : filteredRegistrations.map((reg) => (
                <tr key={reg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reg.receipt_number || reg.reference_number || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(reg.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reg.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reg.mobile_number || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reg.gender === 'male' ? '♂️' : reg.gender === 'female' ? '♀️' : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(() => {
                      const hasParent = !!reg.parent_reference_id;
                      const isFamilyHead = reg.reference_number && reg.family_head_reference === reg.reference_number;
                      if (isFamilyHead) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">👑 Head</span>;
                      if (hasParent) return <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">🔗 Child</span>;
                      return <span className="text-gray-400">-</span>;
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{reg.amount?.toLocaleString() || '0'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(reg)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      View
                    </button>
                    <button 
                      onClick={() => handleExportPDF(reg)}
                      disabled={isGeneratingPdf}
                      className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingPdf ? 'Generating...' : 'PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={handleExportAllPDF}
            disabled={isGeneratingPdf || registrations.length === 0}
            className={`px-4 py-2 text-sm rounded-md flex items-center gap-2 ${
              isGeneratingPdf || registrations.length === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isGeneratingPdf ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export All (PDF)
              </>
            )}
          </button>
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(page * pageSize, total)}
            </span>{' '}
            of <span className="font-medium">{total}</span> results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 border rounded-md ${page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className={`px-4 py-2 border rounded-md ${page >= totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Next
            </button>
          </div>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className={cn(theme.select.base, theme.select.size.md)}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* View Details Modal */}
      {isModalOpen && selectedRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" ref={modalRef}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Registration Details</h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700">Receipt Information</h3>
                  <p className="mt-2"><span className="font-medium">Receipt #:</span> {selectedRegistration.receipt_number}</p>
                  <p><span className="font-medium">Date:</span> {formatDate(selectedRegistration.date)}</p>
                  <p><span className="font-medium">Amount:</span> ₹{selectedRegistration.amount?.toLocaleString() || '0'}</p>
                  <p><span className="font-medium">Amount Paid:</span> ₹{selectedRegistration.amount_paid?.toLocaleString() || '0'}</p>
                  <p><span className="font-medium">Donation:</span> ₹{selectedRegistration.donation?.toLocaleString() || '0'}</p>
                  <p><span className="font-medium">Total:</span> ₹{selectedRegistration.total_amount?.toLocaleString() || '0'}</p>
                  <p><span className="font-medium">Outstanding:</span> ₹{selectedRegistration.outstanding_amount?.toLocaleString() || '0'}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-700">Personal Information</h3>
                  <p className="mt-2"><span className="font-medium">Name:</span> {selectedRegistration.name}</p>
                  <p><span className="font-medium">Father's Name:</span> {selectedRegistration.father_name || 'N/A'}</p>
                  <p><span className="font-medium">Mobile:</span> {selectedRegistration.mobile_number || 'N/A'}</p>
                  <p><span className="font-medium">Aadhaar:</span> {selectedRegistration.aadhaar_number || 'N/A'}</p>
                  <p><span className="font-medium">Education:</span> {selectedRegistration.education || 'N/A'}</p>
                  <p><span className="font-medium">Occupation:</span> {selectedRegistration.occupation || 'N/A'}</p>
                  <p><span className="font-medium">Clan:</span> {selectedRegistration.clan || 'N/A'}</p>
                  <p><span className="font-medium">Group:</span> {selectedRegistration.group || 'N/A'}</p>
                </div>
                
                <div className="col-span-2">
                  <h3 className="font-semibold text-gray-700">Address</h3>
                  <p className="mt-2">{selectedRegistration.address || 'N/A'}</p>
                  <p className="mt-1">Postal Code: {selectedRegistration.postal_code || 'N/A'}</p>
                </div>
                
                <div className="col-span-2">
                  <h3 className="font-semibold text-gray-700">Family Details</h3>
                  <p><span className="font-medium">Male Heirs:</span> {selectedRegistration.male_heirs || 0}</p>
                  <p><span className="font-medium">Female Heirs:</span> {selectedRegistration.female_heirs || 0}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
                <button 
                  onClick={() => selectedRegistration && handleExportPDF(selectedRegistration)}
                  disabled={isGeneratingPdf}
                  className={`px-4 py-2 flex items-center gap-2 rounded-md ${
                    isGeneratingPdf
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isGeneratingPdf ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
