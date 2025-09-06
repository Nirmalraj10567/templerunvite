import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, PlusCircle, Loader2, Eye, Edit, Trash2, Calendar, Clock, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<Pooja[]>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
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
  
  // Filter states
  const [filters, setFilters] = useState({
    name: "",
    mobile: "",
    receipt: "",
    fromDate: "",
    toDate: ""
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Table column search states
  const [columnFilters, setColumnFilters] = useState({
    receipt: "",
    name: "",
    mobile: "",
    dateRange: "",
    time: ""
  });

  const isSuperAdmin = user?.role === "superadmin";

  const canEdit =
    isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "pooja_registrations" &&
        (p.access_level === "edit" || p.access_level === "full")
    );

  const canDelete =
    isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "pooja_registrations" &&
        p.access_level === "full"
    );

  // Fetch pooja entries from API
  const fetchPooja = async () => {
    try {
      setLoading(true);

      // Build search query from filters
      let searchQuery = searchTerm;
      if (filters.name || filters.mobile || filters.receipt) {
        const filterParts = [];
        if (filters.name) filterParts.push(`name:${filters.name}`);
        if (filters.mobile) filterParts.push(`mobile:${filters.mobile}`);
        if (filters.receipt) filterParts.push(`receipt:${filters.receipt}`);
        searchQuery = filterParts.join(' ');
      }

      const result = await poojaService.getPoojaList(
        pagination.pageIndex + 1,
        pagination.pageSize,
        searchQuery
      );
      
      if (result.success) {
        let filteredData = result.data;
        
        // Apply date range filter
        if (filters.fromDate || filters.toDate) {
          filteredData = filteredData.filter((pooja: Pooja) => {
            const poojaFromDate = new Date(pooja.from_date);
            const poojaToDate = new Date(pooja.to_date);
            
            if (filters.fromDate && filters.toDate) {
              const filterFromDate = new Date(filters.fromDate);
              const filterToDate = new Date(filters.toDate);
              return (poojaFromDate >= filterFromDate && poojaFromDate <= filterToDate) ||
                     (poojaToDate >= filterFromDate && poojaToDate <= filterToDate) ||
                     (poojaFromDate <= filterFromDate && poojaToDate >= filterToDate);
            } else if (filters.fromDate) {
              const filterFromDate = new Date(filters.fromDate);
              return poojaToDate >= filterFromDate;
            } else if (filters.toDate) {
              const filterToDate = new Date(filters.toDate);
              return poojaFromDate <= filterToDate;
            }
            return true;
          });
        }

        // Apply column filters
        if (columnFilters.receipt || columnFilters.name || columnFilters.mobile || columnFilters.time || columnFilters.dateRange) {
          filteredData = filteredData.filter((pooja: Pooja) => {
            const matchesReceipt = !columnFilters.receipt || 
              pooja.receipt_number.toLowerCase().includes(columnFilters.receipt.toLowerCase());
            const matchesName = !columnFilters.name || 
              pooja.name.toLowerCase().includes(columnFilters.name.toLowerCase());
            const matchesMobile = !columnFilters.mobile || 
              pooja.mobile_number.includes(columnFilters.mobile);
            const matchesTime = !columnFilters.time || 
              pooja.time.includes(columnFilters.time);
            const matchesDateRange = !columnFilters.dateRange || 
              pooja.from_date.includes(columnFilters.dateRange) ||
              pooja.to_date.includes(columnFilters.dateRange) ||
              `${pooja.from_date} - ${pooja.to_date}`.toLowerCase().includes(columnFilters.dateRange.toLowerCase());
            
            return matchesReceipt && matchesName && matchesMobile && matchesTime && matchesDateRange;
          });
        }
        
        setData(filteredData);
        setPagination((prev) => ({
          ...prev,
          total: filteredData.length,
          totalPages: Math.ceil(filteredData.length / prev.pageSize),
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error("Error fetching pooja data:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to fetch pooja data. Please try again.", "பூஜை தரவைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
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
  }, [pagination.pageIndex, pagination.pageSize, searchTerm, filters, columnFilters]);

  // Load ledger categories for Transfer To Account
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

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const clearFilters = () => {
    setFilters({
      name: "",
      mobile: "",
      receipt: "",
      fromDate: "",
      toDate: ""
    });
    setSearchTerm("");
    clearColumnFilters();
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const hasActiveFilters = () => {
    return filters.name || filters.mobile || filters.receipt || filters.fromDate || filters.toDate || searchTerm ||
           columnFilters.receipt || columnFilters.name || columnFilters.mobile || columnFilters.time || columnFilters.dateRange;
  };

  const handleColumnFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const clearColumnFilters = () => {
    setColumnFilters({
      receipt: "",
      name: "",
      mobile: "",
      dateRange: "",
      time: ""
    });
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

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

    // Ensure all required fields are present
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
        description: t("Failed to update pooja. Please try again.", "பூஜையை புதுப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
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
        description: t("Failed to delete pooja. Please try again.", "பூஜையை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
        variant: "destructive",
      });
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("Pooja List", "பூஜை பட்டியல்")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("Manage pooja registrations", "பூஜை பதிவுகளை நிர்வகிக்கவும்")}
            </p>
          </div>
        
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t("Filters", "வடிகட்டிகள்")}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  {showFilters ? t("Hide Filters", "வடிகட்டிகளை மறை") : t("Show Filters", "வடிகட்டிகளை காட்டு")}
                </Button>
                {hasActiveFilters() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("Clear All", "அனைத்தையும் அழி")}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Quick Search */}
            <div className="mb-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("Quick search...", "விரைவு தேடல்...")}
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="nameFilter">{t("Name", "பெயர்")}</Label>
                  <Input
                    id="nameFilter"
                    placeholder={t("Filter by name...", "பெயரால் வடிகட்டு...")}
                    value={filters.name}
                    onChange={(e) => handleFilterChange('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobileFilter">{t("Mobile Number", "மொபைல் எண்")}</Label>
                  <Input
                    id="mobileFilter"
                    placeholder={t("Filter by mobile...", "மொபைலால் வடிகட்டு...")}
                    value={filters.mobile}
                    onChange={(e) => handleFilterChange('mobile', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptFilter">{t("Receipt Number", "ரசீது எண்")}</Label>
                  <Input
                    id="receiptFilter"
                    placeholder={t("Filter by receipt...", "ரசீதால் வடிகட்டு...")}
                    value={filters.receipt}
                    onChange={(e) => handleFilterChange('receipt', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromDateFilter">{t("From Date", "தொடக்க தேதி")}</Label>
                  <Input
                    id="fromDateFilter"
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDateFilter">{t("To Date", "முடிவு தேதி")}</Label>
                  <Input
                    id="toDateFilter"
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t("Clear Filters", "வடிகட்டிகளை அழி")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card>
          <CardContent className="pt-6">

            {/* Table */}
            <div className="rounded-md border">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{t("Receipt No", "ரசீது எண்")}</div>
                          <Input
                            placeholder={t("Search receipt...", "ரசீது தேடு...")}
                            value={columnFilters.receipt}
                            onChange={(e) => handleColumnFilterChange('receipt', e.target.value)}
                            className="h-7 text-xs border-gray-300"
                          />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{t("Name", "பெயர்")}</div>
                          <Input
                            placeholder={t("Search name...", "பெயர் தேடு...")}
                            value={columnFilters.name}
                            onChange={(e) => handleColumnFilterChange('name', e.target.value)}
                            className="h-7 text-xs border-gray-300"
                          />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{t("Mobile", "மொபைல்")}</div>
                          <Input
                            placeholder={t("Search mobile...", "மொபைல் தேடு...")}
                            value={columnFilters.mobile}
                            onChange={(e) => handleColumnFilterChange('mobile', e.target.value)}
                            className="h-7 text-xs border-gray-300"
                          />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{t("Date Range", "தேதி வரம்பு")}</div>
                          <Input
                            placeholder={t("Search date...", "தேதி தேடு...")}
                            value={columnFilters.dateRange}
                            onChange={(e) => handleColumnFilterChange('dateRange', e.target.value)}
                            className="h-7 text-xs border-gray-300"
                          />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{t("Time", "நேரம்")}</div>
                          <Input
                            placeholder={t("Search time...", "நேரம் தேடு...")}
                            value={columnFilters.time}
                            onChange={(e) => handleColumnFilterChange('time', e.target.value)}
                            className="h-7 text-xs border-gray-300"
                          />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{t("Actions", "செயல்கள்")}</div>
                          <div className="h-7 flex items-center justify-end">
                            {hasActiveFilters() && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                              >
                                <X className="h-3 w-3 mr-1" />
                                {t("Clear", "அழி")}
                              </Button>
                            )}
                          </div>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length > 0 ? (
                      data.map((pooja) => (
                        <TableRow key={pooja.id}>
                          <TableCell className="font-medium">
                            {pooja.receipt_number}
                          </TableCell>
                          <TableCell>{pooja.name}</TableCell>
                          <TableCell>{pooja.mobile_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <div className="text-sm">
                                <div>{formatDate(pooja.from_date)}</div>
                                {pooja.from_date !== pooja.to_date && (
                                  <div className="text-muted-foreground">
                                    {t("to", "வரை")} {formatDate(pooja.to_date)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatTime(pooja.time)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewClick(pooja)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(pooja)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(pooja.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          {t("No pooja entries found", "பூஜை பதிவுகள் எதுவும் கிடைக்கவில்லை")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  {t("Showing", "காட்டப்படுகிறது")} {data.length} {t("of", "இல்")}{" "}
                  <span className="font-medium">{pagination.total}</span> {t("items", "உருப்படிகள்")}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        pageIndex: Math.max(0, prev.pageIndex - 1),
                      }))
                    }
                    disabled={pagination.pageIndex === 0}
                  >
                    {t("Previous", "முந்தைய")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPagination((prev) => ({
                        ...prev,
                        pageIndex: prev.pageIndex + 1,
                      }))
                    }
                    disabled={pagination.pageIndex >= pagination.totalPages - 1}
                  >
                    {t("Next", "அடுத்து")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View/Edit Modal */}
        <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? t("Edit Pooja", "பூஜையை திருத்து") : t("View Pooja", "பூஜையை பார்க்க")}
              </DialogTitle>
              <DialogDescription>
                {editMode
                  ? t("Edit the pooja details below", "கீழே உள்ள பூஜை விவரங்களை திருத்தவும்")
                  : t("View the pooja details below", "கீழே உள்ள பூஜை விவரங்களை பார்க்கவும்")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="receiptNumber" className="text-right">
                  {t("Receipt Number", "ரசீது எண்")}
                </Label>
                <Input
                  id="receiptNumber"
                  value={editedPooja.receiptNumber || ""}
                  onChange={(e) =>
                    setEditedPooja({ ...editedPooja, receiptNumber: e.target.value })
                  }
                  className="col-span-3"
                  disabled={!editMode}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  {t("Name", "பெயர்")}
                </Label>
                <Input
                  id="name"
                  value={editedPooja.name || ""}
                  onChange={(e) =>
                    setEditedPooja({ ...editedPooja, name: e.target.value })
                  }
                  className="col-span-3"
                  disabled={!editMode}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mobileNumber" className="text-right">
                  {t("Mobile Number", "மொபைல் எண்")}
                </Label>
                <Input
                  id="mobileNumber"
                  value={editedPooja.mobileNumber || ""}
                  onChange={(e) =>
                    setEditedPooja({ ...editedPooja, mobileNumber: e.target.value })
                  }
                  className="col-span-3"
                  disabled={!editMode}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="time" className="text-right">
                  {t("Time", "நேரம்")}
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={editedPooja.time || ""}
                  onChange={(e) =>
                    setEditedPooja({ ...editedPooja, time: e.target.value })
                  }
                  className="col-span-3"
                  disabled={!editMode}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fromDate" className="text-right">
                  {t("From Date", "தொடக்க தேதி")}
                </Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={editedPooja.fromDate || ""}
                  onChange={(e) =>
                    setEditedPooja({ ...editedPooja, fromDate: e.target.value })
                  }
                  className="col-span-3"
                  disabled={!editMode}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="toDate" className="text-right">
                  {t("To Date", "முடிவு தேதி")}
                </Label>
                <Input
                  id="toDate"
                  type="date"
                  value={editedPooja.toDate || ""}
                  onChange={(e) =>
                    setEditedPooja({ ...editedPooja, toDate: e.target.value })
                  }
                  className="col-span-3"
                  disabled={!editMode}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="remarks" className="text-right">
                  {t("Remarks", "குறிப்புகள்")}
                </Label>
                <Textarea
                  id="remarks"
                  value={editedPooja.remarks || ""}
                  onChange={(e) =>
                    setEditedPooja({ ...editedPooja, remarks: e.target.value })
                  }
                  className="col-span-3"
                  disabled={!editMode}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="transferTo" className="text-right">
                  {t("Transfer To Account", "எந்த கணக்கிற்கு மாற்றுவது")}
                </Label>
                <select
                  id="transferTo"
                  value={editedPooja.transferTo || ''}
                  onChange={(e) => setEditedPooja({ ...editedPooja, transferTo: e.target.value })}
                  className="col-span-3 border rounded p-2"
                  disabled={!editMode}
                >
                  <option value="">{t('Select', 'தேர்ந்தெடு')}</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  {t("Amount", "தொகை")}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={editedPooja.amount || ''}
                  onChange={(e) => setEditedPooja({ ...editedPooja, amount: e.target.value })}
                  className="col-span-3"
                  disabled={!editMode}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsViewEditOpen(false);
                  setViewEditPooja(null);
                  setEditedPooja({});
                }}
              >
                {t("Cancel", "ரத்து செய்")}
              </Button>
              {editMode && (
                <Button onClick={handleSaveEdit} className="bg-orange-600 hover:bg-orange-700">
                  {t("Save Changes", "மாற்றங்களை சேமிக்க")}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Are you sure?", "நீங்கள் உறுதியாகவா?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("This action cannot be undone. This will permanently delete the pooja entry and remove all associated data.", "இந்த செயலை திரும்பப் பெற முடியாது. இது பூஜை பதிவை நிரந்தரமாக நீக்கி அனைத்து தொடர்புடைய தரவுகளையும் அகற்றும்.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Cancel", "ரத்து செய்")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("Delete", "நீக்கு")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
