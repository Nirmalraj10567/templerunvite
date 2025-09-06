import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { FileDown, Printer } from "lucide-react";
import propertyService from "@/services/propertyService";

interface Property {
  id: number;
  name: string;
  details: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export default function PropertyListView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = (en: string, ta: string) => (language === 'tamil' ? ta : en);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<Property[]>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewEditProperty, setViewEditProperty] = useState<Property | null>(null);
  const [isViewEditOpen, setIsViewEditOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProperty, setEditedProperty] = useState<Partial<Property>>({});

  const isSuperAdmin = user?.role === "superadmin";

  const canEdit =
    isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "property_registrations" &&
        (p.access_level === "edit" || p.access_level === "full")
    );

  const canDelete =
    isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "property_registrations" &&
        p.access_level === "full"
    );

  // Column Keys
  type ColKey = 'name' | 'details' | 'value' | 'actions';

  const allColumns: Array<{ key: ColKey; label: string; align?: 'left' | 'right' | 'center' }> = [
    { key: 'name', label: t('Name', 'பெயர்') },
    { key: 'details', label: t('Details', 'விவரங்கள்') },
    { key: 'value', label: t('Value', 'மதிப்பு'), align: 'right' },
    { key: 'actions', label: t('Actions', 'செயல்கள்'), align: 'center' },
  ];

  const STORAGE_KEY = 'property_list_visible_columns_v1';
  const defaultVisible: Record<ColKey, boolean> = {
    name: true,
    details: true,
    value: true,
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

  const visibleColCount = useMemo(() => Object.values(visibleCols).filter(Boolean).length, [visibleCols]);

  // Fetch properties
  const fetchProperties = async () => {
    try {
      setLoading(true);
      const properties: Property[] = await propertyService.getProperties(
        pagination.pageIndex + 1,
        pagination.pageSize,
        searchTerm
      );

      setData(properties);
      setPagination((prev) => ({
        ...prev,
        total: properties.length,
        totalPages: Math.max(1, Math.ceil(properties.length / prev.pageSize)),
      }));
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to fetch properties. Please try again.", "பதிவுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
        variant: "destructive",
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [pagination.pageIndex, pagination.pageSize, searchTerm]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  };

  const handleViewClick = (property: Property) => {
    setViewEditProperty(property);
    setEditedProperty({
      name: property.name,
      details: property.details,
      value: property.value,
    });
    setEditMode(false);
    setIsViewEditOpen(true);
  };

  const handleEditClick = (property: Property) => {
    setViewEditProperty(property);
    setEditedProperty({
      name: property.name,
      details: property.details,
      value: property.value,
    });
    setEditMode(true);
    setIsViewEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!viewEditProperty || !editedProperty) return;

    try {
      const updatedProperty = await propertyService.updateProperty(
        viewEditProperty.id.toString(),
        editedProperty
      );

      setData((prev) =>
        prev.map((prop) =>
          prop.id === viewEditProperty.id ? { ...prop, ...updatedProperty } : prop
        )
      );

      toast({
        title: t("Success", "வெற்றி"),
        description: t("Property updated successfully", "சொத்து வெற்றிகரமாக புதுப்பிக்கப்பட்டது"),
      });

      setIsViewEditOpen(false);
      setViewEditProperty(null);
      setEditedProperty({});
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to update property. Please try again.", "புதுப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
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
      await propertyService.deleteProperty(deleteId.toString());
      setData((prev) => prev.filter((prop) => prop.id !== deleteId));

      toast({
        title: t("Success", "வெற்றி"),
        description: t("Property deleted successfully", "சொத்து வெற்றிகரமாக நீக்கப்பட்டது"),
      });
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to delete property. Please try again.", "நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
        variant: "destructive",
      });
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  // Print single property
  const handlePrintProperty = (property: Property) => {
    const printContent = `
      <div style="text-align:center; margin-bottom:20px;">
        <h2>${t('Property Details', 'சொத்து விவரங்கள்')}</h2>
      </div>
      <div style="margin:20px;">
        <table style="width:100%; border-collapse:collapse; font-size:14px;">
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Name', 'பெயர்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${property.name}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Details', 'விவரங்கள்')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${property.details}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Value', 'மதிப்பு')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${property.value}</td></tr>
          <tr><td style="padding:8px; border-bottom:1px solid #ddd;"><strong>${t('Created', 'உருவாக்கப்பட்டது')}:</strong></td><td style="padding:8px; border-bottom:1px solid #ddd;">${new Date(property.created_at).toLocaleDateString()}</td></tr>
        </table>
      </div>
    `;

    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow?.document.write(`
      <html>
        <head><title>Property - ${property.name}</title></head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.focus();
    printWindow?.print();
  };

  // Export all as PDF (uses print)
  const handleExportPDF = () => {
    window.print();
  };

  // Export CSV placeholder (implement if needed)
  const handleExportCSV = () => {
    alert(t("CSV Export not implemented", "CSV ஏற்றுமதி செயல்படுத்தப்படவில்லை"));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-800">{t('Property List', 'சொத்து பட்டியல்')}</h1>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <Input
                type="search"
                placeholder={t("Search by name or details...", "பெயர் அல்லது விவரங்களால் தேடுக...")}
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <Button onClick={() => setPagination({ ...pagination, pageIndex: 0 })}>
                {t('Search', 'தேடு')}
              </Button>
              <Button variant="outline" onClick={() => setSearchTerm('')}>
                {t('Clear', 'அழி')}
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <FileDown className="h-4 w-4 mr-1" />
                {t('Export CSV', 'CSV ஏற்றுமதி')}
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileDown className="h-4 w-4 mr-1" />
                {t('Export PDF', 'PDF ஏற்றுமதி')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div
        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        onContextMenu={onContextMenu}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {allColumns.map(
                  (col) =>
                    visibleCols[col.key] && (
                      <th
                        key={col.key}
                        className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
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
                  <td
                    colSpan={visibleColCount}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {t('Loading...', 'ஏற்றுகிறது...')}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColCount}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    {t('No properties found', 'சொத்துகள் கிடைக்கவில்லை')}
                  </td>
                </tr>
              ) : (
                data.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    {visibleCols.name && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {property.name}
                      </TableCell>
                    )}
                    {visibleCols.details && (
                      <TableCell className="px-6 py-4 text-sm text-gray-900">
                        {property.details}
                      </TableCell>
                    )}
                    {visibleCols.value && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {property.value}
                      </TableCell>
                    )}
                    {visibleCols.actions && (
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintProperty(property)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewClick(property)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(property)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(property.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            {t('Showing', 'காட்டப்படுகிறது')}{' '}
            <span className="font-medium">{data.length}</span> {t('of', 'மொத்தம்')}{' '}
            <span className="font-medium">{pagination.total}</span> {t('results', 'முடிவுகள்')}
          </div>
          <div className="flex gap-4 text-sm text-gray-700">
            <span>
              {t('Total', 'மொத்தம்')}: <span className="font-medium">{pagination.total}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-4 mt-4">
        <Button
          variant="outline"
          disabled={pagination.pageIndex <= 0}
          onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex - 1 }))}
        >
          {t('Previous', 'முந்தைய')}
        </Button>
        <span className="text-sm">
          {t('Page', 'பக்கம்')} {pagination.pageIndex + 1} {t('of', 'இல்')} {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          disabled={pagination.pageIndex >= pagination.totalPages - 1}
          onClick={() => setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))}
        >
          {t('Next', 'அடுத்தது')}
        </Button>
        <select
          value={pagination.pageSize}
          onChange={(e) => {
            setPagination((prev) => ({
              ...prev,
              pageSize: parseInt(e.target.value, 10),
              pageIndex: 0,
            }));
          }}
          className="ml-auto border rounded px-3 py-1 text-sm"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Context Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 w-64"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">{t('Columns', 'நெடுவரிசைகள்')}</h3>
            <p className="text-xs text-gray-500">
              {t('Visible', 'காட்டப்படும்')} {Object.values(visibleCols).filter(Boolean).length}/{allColumns.length}
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto p-2">
            {allColumns.map((col) => (
              <label
                key={col.key}
                className="flex items-center px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!visibleCols[col.key]}
                  onChange={() =>
                    setVisibleCols((prev) => ({ ...prev, [col.key]: !prev[col.key] }))
                  }
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{col.label}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 p-2 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, true])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Select all', 'அனைத்தையும் தேர்ந்தெடு')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() =>
                setVisibleCols(
                  Object.fromEntries(allColumns.map((c) => [c.key, false])) as Record<ColKey, boolean>
                )
              }
            >
              {t('Clear all', 'அனைத்தையும் அழி')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setVisibleCols({ ...defaultVisible })}
            >
              {t('Reset', 'மீட்டமை')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs ml-auto"
              onClick={() => setMenuOpen(false)}
            >
              {t('Close', 'மூடு')}
            </Button>
          </div>
        </div>
      )}

      {/* View/Edit Modal */}
      <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editMode ? t("Edit Property", "சொத்தைத் திருத்து") : t("View Property", "சொத்தைப் பார்")}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? t("Edit the property details below", "கீழே உள்ள சொத்து விவரங்களைத் திருத்தவும்")
                : t("View the property details below", "கீழே உள்ள சொத்து விவரங்களைப் பார்க்கவும்")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t("Name", "பெயர்")}
              </Label>
              <Input
                id="name"
                value={editedProperty.name || ""}
                onChange={(e) =>
                  setEditedProperty({ ...editedProperty, name: e.target.value })
                }
                className="col-span-3"
                disabled={!editMode}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="details" className="text-right">
                {t("Details", "விவரங்கள்")}
              </Label>
              <Textarea
                id="details"
                value={editedProperty.details || ""}
                onChange={(e) =>
                  setEditedProperty({
                    ...editedProperty,
                    details: e.target.value,
                  })
                }
                className="col-span-3"
                disabled={!editMode}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                {t("Value", "மதிப்பு")}
              </Label>
              <Input
                id="value"
                value={editedProperty.value || ""}
                onChange={(e) =>
                  setEditedProperty({ ...editedProperty, value: e.target.value })
                }
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
                setViewEditProperty(null);
                setEditedProperty({});
              }}
            >
              {t("Cancel", "ரத்துசெய்")}
            </Button>
            {editMode && <Button onClick={handleSaveEdit}>{t("Save Changes", "மாற்றங்களைச் சேமி")}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Are you sure?", "உங்களுக்கு உறுதியா?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "This action cannot be undone. This will permanently delete the property and remove all associated data.",
                "இந்த செயலை மீட்டெடுக்க முடியாது. இது சொத்தை நிரந்தரமாக நீக்கி, தொடர்புடைய அனைத்து தரவுகளையும் அழிக்கும்."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel", "ரத்துசெய்")}</AlertDialogCancel>
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
  );
}