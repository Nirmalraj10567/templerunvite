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
import { useLanguage } from "@/contexts/LanguageContext";
import { poojaService, Pooja, PoojaFormData } from "@/services/poojaService";

export default function PoojaListView() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { language } = useLanguage();

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

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
    { key: 'receipt', label: t('Receipt No', 'ரசீது எண்') },
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'mobile', label: t('Mobile', 'மொபைல்') },
    { key: 'dateRange', label: t('Date Range', 'தேதி வரம்பு') },
    { key: 'time', label: t('Time', 'நேரம்') },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
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
        title: t("Error", "பிழை"),
        description: t("Failed to fetch pooja data", "பூஜை தரவைப் பெற முடியவில்லை"),
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
        const resp = await fetch('/api/ledger/categories', { headers: { Authorization: `Bearer ${token}` } });
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
        title: t("Success", "வெற்றி"),
        description: t("Pooja updated successfully", "பூஜை வெற்றிகரமாக புதுப்பிக்கப்பட்டது"),
      });

      setIsViewEditOpen(false);
      setViewEditPooja(null);
      setEditedPooja({});
    } catch (error) {
      console.error("Error updating pooja:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to update pooja", "பூஜையை புதுப்பிக்க முடியவில்லை"),
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
        title: t("Success", "வெற்றி"),
        description: t("Pooja deleted successfully", "பூஜை வெற்றிகரமாக நீக்கப்பட்டது"),
      });
    } catch (error) {
      console.error("Error deleting pooja:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to delete pooja", "பூஜையை நீக்க முடியவில்லை"),
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
        <h1 className="text-base font-bold text-gray-800">{t("Pooja List", "பூஜை பட்டியல்")}</h1>
        <div className="text-xs text-gray-500">
          {filteredData.length} {t("entries", "பதிவுகள்")}
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
                placeholder={t("Search receipt, name, mobile...", "ரசீது, பெயர், மொபைல் தேடு...")}
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
              {t("Clear", "அழி")}
            </Button>

            <Button variant="outline" size="sm" onClick={handleExportPdf} className="text-xs h-7 px-2">
              <FileDown className="h-3 w-3 mr-1" />
              {t("Export", "ஏற்றுமதி")}
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
                    {t("Loading...", "ஏற்றுகிறது...")}
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
                    {t("No pooja entries found", "பூஜை பதிவுகள் எதுவும் கிடைக்கவில்லை")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-2 py-1 flex items-center justify-between border-t border-gray-200 text-xs">
          <div className="text-gray-700">
            {t("Showing", "காட்டப்படுகிறது")} <span className="font-medium">
              {pagination.pageIndex * pagination.pageSize + 1}-{
                Math.min((pagination.pageIndex + 1) * pagination.pageSize, pagination.total)
              }
            </span> {t("of", "இல்")}{" "}
            <span className="font-medium">{pagination.total}</span> {t("items", "உருப்படிகள்")}
          </div>
          <div className="text-gray-700">
            {t("Total", "மொத்தம்")}: <span className="font-medium">{pagination.total}</span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 text-xs">
          <div className="text-gray-500 text-xs">
            {t("Showing", "காட்டப்படுகிறது")} {pagination.pageSize} {t("per page", "ஒரு பக்கத்திற்கு")}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: 0 }))}
              disabled={pagination.pageIndex === 0}
              className="text-xs py-1 px-2 h-7"
            >
              {t("First", "முதல்")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))}
              disabled={pagination.pageIndex === 0}
              className="text-xs py-1 px-2 h-7"
            >
              {t("Previous", "முந்தைய")}
            </Button>
            <span className="text-xs">
              {t("Page", "பக்கம்")} {pagination.pageIndex + 1} {t("of", "இல்")} {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: Math.min(prev.pageIndex + 1, pagination.totalPages - 1) }))}
              disabled={pagination.pageIndex >= pagination.totalPages - 1}
              className="text-xs py-1 px-2 h-7"
            >
              {t("Next", "அடுத்து")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, pageIndex: pagination.totalPages - 1 }))}
              disabled={pagination.pageIndex >= pagination.totalPages - 1}
              className="text-xs py-1 px-2 h-7"
            >
              {t("Last", "கடைசி")}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t("Rows per page", "ஒரு பக்கத்திற்கு")}:</span>
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
            <h3 className="text-xs font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className="text-xs text-gray-500">
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
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
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto"
              onClick={() =>
                setVisibleCols(Object.fromEntries(allColumns.map((c) => [c.key, false])) as any)
              }
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs py-0.5 px-1.5 h-auto ml-auto"
              onClick={() => setMenuOpen(false)}
            >
              {t('Close', 'மூடு')}
            </Button>
          </div>
        </div>
      )}

      {/* View/Edit Modal */}
      <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editMode ? t("Edit Pooja", "பூஜையை திருத்து") : t("View Pooja", "பூஜையை பார்க்க")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{t("Receipt No", "ரசீது எண்")}</Label>
              <Input
                value={editedPooja.receiptNumber || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, receiptNumber: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{t("Name", "பெயர்")}</Label>
              <Input
                value={editedPooja.name || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, name: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{t("Mobile", "மொபைல்")}</Label>
              <Input
                value={editedPooja.mobileNumber || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, mobileNumber: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{t("Time", "நேரம்")}</Label>
              <Input
                type="time"
                value={editedPooja.time || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, time: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{t("From Date", "தொடக்க தேதி")}</Label>
              <Input
                type="date"
                value={editedPooja.fromDate || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, fromDate: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{t("To Date", "முடிவு தேதி")}</Label>
              <Input
                type="date"
                value={editedPooja.toDate || ""}
                onChange={(e) => setEditedPooja({ ...editedPooja, toDate: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <Label className="text-xs">{t("Amount", "தொகை")}</Label>
              <Input
                type="number"
                value={editedPooja.amount || ''}
                onChange={(e) => setEditedPooja({ ...editedPooja, amount: e.target.value })}
                className="col-span-2 text-xs h-7"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-3 items-start gap-2">
              <Label className="text-xs">{t("Remarks", "குறிப்புகள்")}</Label>
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
              {t("Cancel", "ரத்து செய்")}
            </Button>
            {editMode && (
              <Button size="sm" onClick={handleSaveEdit} className="text-xs">
                {t("Save", "சேமி")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">{t("Are you sure?", "நீங்கள் உறுதியாகவா?")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              {t("This will permanently delete the pooja entry.", "இது பூஜை பதிவை நிரந்தரமாக நீக்கும்.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">{t("Cancel", "ரத்து செய்")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("Delete", "நீக்கு")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
