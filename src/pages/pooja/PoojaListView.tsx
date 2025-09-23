import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, Eye, Edit, Trash2, Calendar, Clock, Filter, X, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/lib/language";
import { poojaService, Pooja, PoojaFormData } from "@/services/poojaService";

export default function PoojaListView() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { language } = useLanguage();

  // Translation object
  const t = {
    english: {
      poojaList: 'பூஜை பட்டியல்',
      entries: 'பதிவுகள்',
      showing: 'காட்டப்படுகிறது',
      of: 'இல்',
      items: 'உருப்படிகள்',
      total: 'மொத்தம்',
      page: 'பக்கம்',
      receiptNo: 'ரசீது எண்',
      name: 'பெயர்',
      mobile: 'மொபைல்',
      dateRange: 'தேதி வரம்பு',
      time: 'நேரம்',
      actions: 'செயல்கள்',
      loading: 'ஏற்றுகிறது…',
      searchPlaceholder: 'பூஜைகளைத் தேடு...',
      clear: 'அழி',
      export: 'ஏற்றுமதி',
      view: 'காண்க',
      edit: 'திருத்து',
      delete: 'நீக்கு',
      confirmDelete: 'இந்த பூஜையை நிச்சயமாக நீக்க விரும்புகிறீர்களா?',
      cancel: 'ரத்து செய்',
      confirm: 'உறுதி செய்',
      close: 'மூடு',
      saveChanges: 'மாற்றங்களை சேமி',
      success: 'வெற்றி',
      receipt: 'ரசீது',
      poojaName: 'பூஜை பெயர்',
      poojaDate: 'பூஜை தேதி',
      poojaTime: 'பூஜை நேரம்',
      devoteeName: 'பக்தர் பெயர்',
      devoteeMobile: 'பக்தர் மொபைல்',
      address: 'முகவரி',
      amount: 'தொகை',
      notes: 'குறிப்புகள்',
      remarks: 'கருத்துகள்',
      fromDate: 'தொடக்க தேதி',
      toDate: 'முடிவு தேதி',
      status: 'நிலை',
      columns: 'நெடுவரிசைகள்',
      visible: 'புலப்படும்',
      selectAll: 'அனைத்தையும் தேர்ந்தெடு',
      clearAll: 'அனைத்தையும் அழி',
      first: 'முதல்',
      previous: 'முந்தைய',
      next: 'அடுத்து',
      last: 'கடைசி',
      rowsPerPage: 'ஒரு பக்கத்திற்கு',
      noPoojaEntriesFound: 'பூஜை பதிவுகள் எதுவும் கிடைக்கவில்லை',
      error: 'பிழை',
      failedToFetchData: 'தரவைப் பெற முடியவில்லை',
      failedToUpdatePooja: 'பூஜையை புதுப்பிக்க முடியவில்லை',
      failedToDeletePooja: 'பூஜையை நீக்க முடியவில்லை',
      poojaUpdatedSuccessfully: 'பூஜை வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
      poojaDeletedSuccessfully: 'பூஜை வெற்றிகரமாக நீக்கப்பட்டது',
    },
    tamil: {
      poojaList: 'Pooja List',
      entries: 'entries',
      showing: 'Showing',
      of: 'of',
      items: 'items',
      total: 'Total',
      page: 'Page',
      receiptNo: 'Receipt No',
      name: 'Name',
      mobile: 'Mobile',
      dateRange: 'Date Range',
      time: 'Time',
      actions: 'Actions',
      loading: 'Loading…',
      searchPlaceholder: 'Search poojas...',
      clear: 'Clear',
      export: 'Export',
      view: 'View',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this pooja?',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      saveChanges: 'Save Changes',
      success: 'Success',
      receipt: 'Receipt',
      poojaName: 'Pooja Name',
      poojaDate: 'Pooja Date',
      poojaTime: 'Pooja Time',
      devoteeName: 'Devotee Name',
      devoteeMobile: 'Devotee Mobile',
      address: 'Address',
      amount: 'Amount',
      notes: 'Notes',
      remarks: 'Remarks',
      fromDate: 'From Date',
      toDate: 'To Date',
      status: 'Status',
      columns: 'Columns',
      visible: 'Visible',
      selectAll: 'Select all',
      clearAll: 'Clear all',
      first: 'First',
      previous: 'Previous',
      next: 'Next',
      last: 'Last',
      rowsPerPage: 'Rows per page',
      noPoojaEntriesFound: 'No pooja entries found',
      error: 'Error',
      failedToFetchData: 'Failed to fetch data',
      failedToUpdatePooja: 'Failed to update pooja',
      failedToDeletePooja: 'Failed to delete pooja',
      poojaUpdatedSuccessfully: 'Pooja updated successfully',
      poojaDeletedSuccessfully: 'Pooja deleted successfully',
    }
  };

  // Helper function to get translation
  const translate = (key: string) => {
    const lang = language === 'tamil' || language === 'english' ? language : 'tamil';
    return (t as any)[lang]?.[key] ?? key;
  };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Pooja[]>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 15,
    total: 0,
    totalPages: 1,
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewEditPooja, setViewEditPooja] = useState<Pooja | null>(null);
  const [isViewEditOpen, setIsViewEditOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedPooja, setEditedPooja] = useState<Partial<PoojaFormData>>({});
  const [categories, setCategories] = useState<Array<{ id: number; value: string; label: string }>>([]);
  
  // Quick search filter
  const [quickSearch, setQuickSearch] = useState("");
  
  // Column Keys
  type ColKey = 'receipt' | 'name' | 'mobile' | 'dateRange' | 'time' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'receipt', label: translate('receiptNo') },
    { key: 'name', label: translate('name') },
    { key: 'mobile', label: translate('mobile') },
    { key: 'dateRange', label: translate('dateRange') },
    { key: 'time', label: translate('time') },
    { key: 'actions', label: translate('actions'), align: 'center' },
  ];

  const STORAGE_KEY = 'pooja_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    receipt: true,
    name: true,
    mobile: true,
    dateRange: true,
    time: true,
    actions: true,
  };

  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaultVisible, ...JSON.parse(saved) } : defaultVisible;
    } catch {
      return defaultVisible;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  // Context Menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const visibleColCount = useMemo(
    () => Object.values(visibleCols).filter(Boolean).length,
    [visibleCols]
  );

  const isSuperAdmin = user?.role === "superadmin";

  const canEdit = isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "pooja_registrations" &&
        (p.access_level === "edit" || p.access_level === "full")
    );

  const canDelete = isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "pooja_registrations" &&
        p.access_level === "full"
    );

  const fetchPooja = async () => {
    try {
      setLoading(true);
      const result = await poojaService.getPoojaList(
        pagination.pageIndex + 1,
        pagination.pageSize,
        quickSearch
      );
      
      if (result.success) {
        setData(result.data);
        setPagination((prev) => ({
          ...prev,
          total: result.pagination?.total || result.data.length,
          totalPages: result.pagination?.totalPages || Math.ceil((result.pagination?.total || result.data.length) / prev.pageSize),
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error("Error fetching pooja data:", error);
      toast({
        title: translate("error"),
        description: translate("failedToFetchData"),
        variant: "destructive",
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPooja();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, quickSearch]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!token) return;
        const resp = await fetch('http://localhost:4000/api/ledger/categories', { headers: { Authorization: `Bearer ${token}` } });
        const body = await resp.json().catch(() => ({}));
        const raw = Array.isArray(body?.data) ? body.data : (Array.isArray(body) ? body : []);
        const mapped = (raw || []).map((item: any, idx: number) => {
          if (typeof item === 'string') return { id: idx + 1, value: item, label: item };
          return { id: item.id || idx + 1, value: item.value || item.label, label: item.label || item.value };
        });
        setCategories(mapped);
      } catch (e) {
        // ignore
      }
    };
    load();
  }, [token]);

  const handleViewClick = (pooja: Pooja) => {
    setViewEditPooja(pooja);
    setEditedPooja({
      receiptNumber: pooja.receipt_number,
      name: pooja.name,
      mobileNumber: pooja.mobile_number,
      time: pooja.time,
      fromDate: pooja.from_date,
      toDate: pooja.to_date,
      remarks: pooja.remarks,
      transferTo: (pooja as any).transfer_to_account || '',
      amount: (pooja as any).amount != null ? String((pooja as any).amount) : '',
    });
    setEditMode(false);
    setIsViewEditOpen(true);
  };

  const handleEditClick = (pooja: Pooja) => {
    setViewEditPooja(pooja);
    setEditedPooja({
      receiptNumber: pooja.receipt_number,
      name: pooja.name,
      mobileNumber: pooja.mobile_number,
      time: pooja.time,
      fromDate: pooja.from_date,
      toDate: pooja.to_date,
      remarks: pooja.remarks,
      transferTo: (pooja as any).transfer_to_account || '',
      amount: (pooja as any).amount != null ? String((pooja as any).amount) : '',
    });
    setEditMode(true);
    setIsViewEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!viewEditPooja || !editedPooja) return;

    const updateData: PoojaFormData = {
      receiptNumber: editedPooja.receiptNumber || viewEditPooja.receipt_number,
      name: editedPooja.name || '',
      mobileNumber: editedPooja.mobileNumber || '',
      time: editedPooja.time || '',
      fromDate: editedPooja.fromDate || '',
      toDate: editedPooja.toDate || '',
      remarks: editedPooja.remarks || '',
      transferTo: editedPooja.transferTo || '',
      amount: editedPooja.amount || ''
    };

    try {
      await poojaService.updatePooja(viewEditPooja.id, updateData);

      setData((prev) =>
        prev.map((item) =>
          item.id === viewEditPooja.id ? { ...item, ...editedPooja } : item
        )
      );

      toast({
        title: translate("success"),
        description: translate("poojaUpdatedSuccessfully"),
      });

      setIsViewEditOpen(false);
      setViewEditPooja(null);
      setEditedPooja({});
    } catch (error) {
      console.error("Error updating pooja:", error);
      toast({
        title: translate("error"),
        description: translate("failedToUpdatePooja"),
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      await poojaService.deletePooja(deleteId);
      setData((prev) => prev.filter((item) => item.id !== deleteId));
      toast({
        title: translate("success"),
        description: translate("poojaDeletedSuccessfully"),
      });
    } catch (error) {
      console.error("Error deleting pooja:", error);
      toast({
        title: translate("error"),
        description: translate("failedToDeletePooja"),
        variant: "destructive",
      });
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const handleExportPdf = () => {
    window.print();
  };

  // Use data directly since filtering is now done server-side
  const filteredData = data;

  return (
    <div className="p-2 bg-gray-50">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-base font-bold text-gray-800">{translate("poojaList")}</h1>
        <div className="text-xs text-gray-500">
          {filteredData.length} {translate("entries")}
        </div>
      </div>

      {/* Compact Filters */}
      <Card className="mb-2">
        <CardContent className="p-2">
          <div className="flex gap-2 items-center">
            {/* Quick Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder={translate("searchPlaceholder")}
                className="pl-7 text-xs h-7"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
              />
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickSearch("")}
              disabled={!quickSearch}
              className="text-xs h-7 px-2"
            >
              <X className="h-3 w-3 mr-1" />
              {translate("clear")}
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportPdf} className="text-xs h-7 px-2">
              <FileDown className="h-3 w-3 mr-1" />
              {translate("export")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compact Table */}
      <div
        className="bg-white rounded border border-gray-200 overflow-hidden"
        onContextMenu={onContextMenu}
      >
        <div className="overflow-x-auto text-xs max-h-[65vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`px-2 py-1 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    )
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={visibleColCount} className="px-2 py-4 text-center text-xs text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    {translate("loading")}
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((pooja) => (
                  <tr key={pooja.id} className="hover:bg-gray-50">
                    {visibleCols.receipt && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs font-medium text-gray-900">
                        {pooja.receipt_number}
                      </td>
                    )}
                    {visibleCols.name && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900 max-w-32 truncate">
                        {pooja.name}
                      </td>
                    )}
                    {visibleCols.mobile && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        {pooja.mobile_number}
                      </td>
                    )}
                    {visibleCols.dateRange && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          <div>
                            <div>{formatDate(pooja.from_date)}</div>
                            {pooja.from_date !== pooja.to_date && (
                              <div className="text-gray-400">
                                - {formatDate(pooja.to_date)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleCols.time && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-900">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-gray-400" />
                          {formatTime(pooja.time)}
                        </div>
                      </td>
                    )}
                    {visibleCols.actions && (
                      <td className="px-2 py-1 whitespace-nowrap text-xs text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewClick(pooja)}
                            className="h-6 w-6 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(pooja)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(pooja.id)}
                              className="h-6 w-6 p-0 text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleColCount} className="px-2 py-8 text-center text-xs text-gray-500">
                    {translate("noPoojaEntriesFound")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-2 py-1 flex items-center justify-between border-t border-gray-200 text-xs">
          <div className="text-gray-700">
            {translate("showing")} <span className="font-medium">
              {pagination.pageIndex * pagination.pageSize + 1}-{
                Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.total)
              }
            </span> {translate("of")}{" "}
            <span className="font-medium">{pagination.total}</span> {translate("items")}
          </div>
          <div className="text-gray-700">
            {translate("total")}: <span className="font-medium">{pagination.total}</span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 text-xs">
          <div className="text-gray-500 text-xs">
            {translate("showing")} {pagination.pageSize} {translate("rowsPerPage")}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
              disabled={pagination.pageIndex === 0}
              className="text-xs py-1 px-2 h-7"
            >
              {translate("first")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
              disabled={pagination.pageIndex === 0}
              className="text-xs py-1 px-2 h-7"
            >
              {translate("previous")}
            </Button>
            <span className="text-xs">
              {translate("page")} {pagination.pageIndex + 1} {translate("of")} {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.min(prev.pageIndex + 1, pagination.totalPages - 1) }))}
              disabled={pagination.pageIndex >= pagination.totalPages - 1}
              className="text-xs py-1 px-2 h-7"
            >
              {translate("next")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: pagination.totalPages - 1 }))}
              disabled={pagination.pageIndex >= pagination.totalPages - 1}
              className="text-xs py-1 px-2 h-7"
            >
              {translate("last")}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{translate("rowsPerPage")}: </span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => {
                setPagination(prev => ({
                  ...prev,
                  pageSize: Number(value),
                  pageIndex: 0 // Reset to first page
                }));
              }}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue placeholder={pagination.pageSize} />
              </SelectTrigger>
              <SelectContent>
                {[10, 15, 25, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded shadow border border-gray-200 w-48 text-xs"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <div className="px-3 py-2 border-b border-gray-200">
            <h3 className="text-xs font-medium text-gray-900">{translate('columns')}</h3>
            <p className="text-xs text-gray-500">
              {translate('visible')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {allColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center px-2 py-1 rounded hover:bg-gray-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!visibleCols[col.key]}
                  onChange={() =>
                    setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                  }
                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-xs text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 p-1 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto"
              onClick={() =>
                setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, true])) as any)
              }
            >
              {translate('selectAll')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto"
              onClick={() =>
                setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, false])) as any)
              }
            >
              {translate('clearAll')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto ml-auto"
              onClick={() => setMenuOpen(false)}
            >
              {translate('close')}
            </Button>
          </div>
        </div>
      )}

      {/* View/Edit Modal */}
      <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editMode ? translate("edit") : translate("view")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("receiptNo")}</Label>
              <Input
                value={editedPooja.receiptNumber || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, receiptNumber: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("name")}</Label>
              <Input
                value={editedPooja.name || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, name: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("mobile")}</Label>
              <Input
                value={editedPooja.mobileNumber || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, mobileNumber: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("time")}</Label>
              <Input
                type="time"
                value={editedPooja.time || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, time: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("fromDate")}</Label>
              <Input
                type="date"
                value={editedPooja.fromDate || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, fromDate: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("toDate")}</Label>
              <Input
                type="date"
                value={editedPooja.toDate || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, toDate: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{translate("amount")}</Label>
              <Input
                type="number"
                value={editedPooja.amount || ''}
                onChange={(e) => setEditedPooja({ ...editedPooja, amount: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-start gap-2">
              <Label className="text-xs">{translate("remarks")}</Label>
              <Textarea
                value={editedPooja.remarks || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, remarks: e.target.value })}
                className="col-span-2 text-xs"
                disabled={!editMode}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsViewEditOpen(false);
                setViewEditPooja(null);
                setEditedPooja({});
              }}
              className="text-xs"
            >
              {translate("cancel")}
            </Button>
            {editMode && (
              <Button size="sm" onClick={handleSaveEdit} className="text-xs">
                {translate("saveChanges")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">{translate("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {translate("confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">{translate("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {translate("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
