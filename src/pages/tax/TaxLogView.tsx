import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/styles/formStyles";
import { formFieldStyles } from "@/styles/formStyles";

interface TaxLogViewProps {
  recentOnly?: boolean;
}

interface TaxLog {
  id: number;
  tax_registration_id: number;
  registration_name: string | null;
  registration_ref: string | null;
  action: string;
  created_at: string;
  created_by: number | null;
  details: any;
}

export default function TaxLogView({ recentOnly = false }: TaxLogViewProps) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'english' ? ta : en);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [logs, setLogs] = useState<TaxLog[]>([]);
  const [userDetails, setUserDetails] = useState<Record<number, { name: string; username?: string; mobile?: string }>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch user details
  const fetchUserDetails = useCallback(async (userIds: number[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter((v): v is number => typeof v === 'number')));
    if (uniqueIds.length === 0) return;

    const missing = uniqueIds.filter(id => !userDetails[id]);
    if (missing.length === 0) return;

    const results = await Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`https://tmsapi.xesstechlink.com/api/admin/members/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return null;
          const u = data?.data?.user || data?.data;
          if (!u) return null;
          const fullName = (u.full_name && String(u.full_name).trim()) || u.username || u.mobile || String(id);
          return { id, name: fullName, username: u.username, mobile: u.mobile };
        } catch {
          return null;
        }
      })
    );

    const detailsMap: Record<number, { name: string; username?: string; mobile?: string }> = {};
    results.forEach(r => {
      if (r) detailsMap[r.id] = { name: r.name, username: r.username, mobile: r.mobile };
    });

    if (Object.keys(detailsMap).length > 0) {
      setUserDetails(prev => ({ ...prev, ...detailsMap }));
    }
  }, [token, userDetails]);

  // Fetch logs
  const fetchLogs = useCallback(async (page = 1, search = "") => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: recentOnly ? '10' : '50',
      ...(search && { search }),
      ...(recentOnly && { recent: 'true' })
    });
    try {
      setLoading(true);
      const res = await fetch(
        `https://tmsapi.xesstechlink.com/api/tax-registrations/logs?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error('Failed to fetch logs');
      const result = await res.json();

      if (result.success) {
        const logsData = Array.isArray(result.data) ? result.data : [];
        setLogs(logsData);
        
        const total = Number(result.total || 0);
        const totalPages = Math.max(1, Math.ceil(total / 50));
        
        setPagination({
          page,
          pageSize: 50,
          total,
          totalPages,
        });

        const userIds = logsData
          .map(log => log.created_by)
          .filter((id): id is number => id !== null && id !== undefined);
          
        if (userIds.length > 0) {
          await fetchUserDetails(userIds);
        }
      } else {
        setLogs([]);
        setPagination({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
      setLogs([]);
      setPagination({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }, [token, fetchUserDetails, recentOnly]);

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearchTerm(searchTerm);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    fetchLogs(newPage, debouncedSearchTerm);
  };

  // Trigger API call when debounced search or initial load changes
  useEffect(() => {
    fetchLogs(1, debouncedSearchTerm);
  }, [debouncedSearchTerm, fetchLogs]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Helper function to format amounts
  const formatAmount = (amount: any) => {
    const num = Number(amount);
    return Number.isFinite(num) ? `₹${num.toFixed(2)}` : '-';
  };

  // Helper function to get amount info
  const getAmountInfo = (details: any, compact = false) => {
    // Check for amount fields in different possible locations
    const taxAmount = details.tax_amount || details.taxAmount || details.total_tax || details.totalAmount;
    const amountPaid = details.amount_paid || details.amountPaid || details.paid_amount || details.paidAmount;
    const outstanding = details.outstanding_amount || details.outstandingAmount;
    
    // Only show if we have at least one amount field
    if (!taxAmount && !amountPaid && outstanding === undefined) return null;
    
    if (compact) {
      return (
        <div className="text-xs text-gray-600">
          <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(taxAmount)}</div>
          <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(amountPaid)}</div>
          {outstanding !== undefined && (
            <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(outstanding)}</div>
          )}
        </div>
      );
    }
    
    return (
      <div className="bg-gray-50 p-2 rounded border text-xs">
        <div className="font-medium text-gray-700 mb-1">{t('Amount Details', 'தொகை விவரங்கள்')}</div>
        <div className="space-y-1">
          <div>{t('Tax Amount', 'வரி தொகை')}: {formatAmount(taxAmount)}</div>
          <div>{t('Amount Paid', 'செலுத்திய தொகை')}: {formatAmount(amountPaid)}</div>
          {outstanding !== undefined && (
            <div>{t('Outstanding', 'நிலுவை')}: {formatAmount(outstanding)}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {loading && debouncedSearchTerm === searchTerm ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
            <Input
              placeholder={t('Search logs by name, reference, or user...', 'பெயர், குறிப்பு அல்லது பயனர் மூலம் தேடவும்...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={loading && debouncedSearchTerm === searchTerm}
            />
          </div>
          <Button 
            type="submit" 
            variant="outline" 
            disabled={loading && debouncedSearchTerm === searchTerm}
          >
            {t('Search', 'தேடு')}
          </Button>
        </div>
      </form>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        {loading && debouncedSearchTerm === searchTerm ? (
          <div className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Action', 'செயல்')}</TableHead>
                <TableHead>{t('Date & Time', 'தேதி & நேரம்')}</TableHead>
                <TableHead>{t('Reg ID', 'பதிவு ஐடி')}</TableHead>
                <TableHead>{t('Name', 'பெயர்')}</TableHead>
                <TableHead>{t('Ref No', 'குறிப்பு எண்')}</TableHead>
                <TableHead>{t('User', 'பயனர்')}</TableHead>
                <TableHead>{t('Details', 'விவரங்கள்')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((lg) => (
                  <TableRow key={lg.id}>
                    <TableCell>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        lg.action === 'create' ? 'bg-green-100 text-green-800' :
                        lg.action === 'update' ? 'bg-blue-100 text-blue-800' :
                        lg.action === 'delete' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {lg.action === 'create' ? t('Created', 'உருவாக்கப்பட்டது') :
                         lg.action === 'update' ? t('Updated', 'புதுப்பிக்கப்பட்டது') :
                         lg.action === 'delete' ? t('Deleted', 'நீக்கப்பட்டது') :
                         lg.action}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{lg.created_at ? formatDate(lg.created_at) : '-'}</TableCell>
                    <TableCell>{lg.tax_registration_id}</TableCell>
                    <TableCell>{lg.registration_name ?? '-'}</TableCell>
                    <TableCell>{lg.registration_ref ?? '-'}</TableCell>
                    <TableCell>
                      {(() => {
                        const userId = lg.created_by;
                        if (!userId) return '-';
                        const user = userDetails[userId];
                        if (user?.username) return `@${user.username}`;
                        if (user?.name) return user.name;
                        return `User ${userId}`;
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-600 max-w-md">
                        {(() => {
                          // Parse tax registration details from the log data
                          const details = lg.details;
                          if (!details) return <span className="text-gray-400">-</span>;
                          
                          // Extract specific fields from the details
                          const name = details.name || details.after?.name || details.before?.name;
                          const referenceNumber = details.reference_number || details.after?.reference_number || details.before?.reference_number;
                          const mobileNumber = details.mobile_number || details.after?.mobile_number || details.before?.mobile_number;
                          const aadhaarNumber = details.aadhaar_number || details.after?.aadhaar_number || details.before?.aadhaar_number;
                          const village = details.village || details.after?.village || details.before?.village;
                          const taxAmount = details.tax_amount || details.after?.tax_amount || details.before?.tax_amount;
                          const amountPaid = details.amount_paid || details.after?.amount_paid || details.before?.amount_paid;
                          const outstandingAmount = details.outstanding_amount || details.after?.outstanding_amount || details.before?.outstanding_amount;
                          
                          return (
                            <div className="space-y-2">
                              <div className="bg-purple-50 p-3 rounded border text-xs">
                                <div className="font-medium text-purple-700 mb-2">{t('Tax Registration Details', 'வரி பதிவு விவரங்கள்')}</div>
                                <div className="space-y-1 text-gray-600">
                                  {name && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">{t('Name', 'பெயர்')}:</span>
                                      <span>{name}</span>
                                    </div>
                                  )}
                                  {referenceNumber && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">{t('Reference', 'குறிப்பு')}:</span>
                                      <span>{referenceNumber}</span>
                                    </div>
                                  )}
                                  {mobileNumber && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">{t('Mobile', 'தொலைபேசி')}:</span>
                                      <span>{mobileNumber}</span>
                                    </div>
                                  )}
                                  {aadhaarNumber && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">{t('Aadhaar', 'ஆதார்')}:</span>
                                      <span>{aadhaarNumber}</span>
                                    </div>
                                  )}
                                  {village && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">{t('Village', 'கிராமம்')}:</span>
                                      <span>{village}</span>
                                    </div>
                                  )}
                                  {taxAmount && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">{t('Tax Amount', 'வரி தொகை')}:</span>
                                      <span>₹{taxAmount}</span>
                                    </div>
                                  )}
                                  {amountPaid && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">{t('Amount Paid', 'செலுத்திய தொகை')}:</span>
                                      <span>₹{amountPaid}</span>
                                    </div>
                                  )}
                                  {outstandingAmount !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="font-medium">{t('Outstanding', 'நிலுவை')}:</span>
                                      <span>₹{outstandingAmount}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {t('Showing', 'காட்டப்படுகிறது')}{" "}
          <span className="font-medium">
            {logs.length > 0 
              ? `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)}` 
              : '0'}
          </span>{" "}
          {t('of', 'இல்')}{" "}
          <span className="font-medium">{pagination.total}</span>{" "}
          {t('items', 'உருப்படிகள்')}
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page <= 1 || loading}
            >
              {t('First', 'முதல்')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
            >
              {t('Previous', 'முந்தைய')}
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {t('Page', 'பக்கம்')} {pagination.page} {t('of', 'இலிருந்து')} {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              {t('Next', 'அடுத்தது')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={pagination.page >= pagination.totalPages || loading}
            >
              {t('Last', 'கடைசி')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
