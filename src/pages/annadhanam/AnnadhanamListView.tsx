import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, PlusCircle, Loader2, Eye, Edit, Trash2, Calendar, Users, Clock, FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Annadhanam {
  id: number;
  receipt_number: string;
  name: string;
  mobile_number: string;
  food: string;
  peoples: number;
  time: string;
  from_date: string;
  to_date: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

interface AnnadhanamFormData {
  name: string;
  mobileNumber: string;
  food: string;
  peoples: number;
  time: string;
  fromDate: string;
  toDate: string;
  remarks?: string;
}

interface AnnadhanamLog {
  id: number;
  annadhanam_id: number;
  action: string;
  created_at: string;
  created_by: number | null;
  annadhanam_name: string | null;
  receipt_number: string | null;
  details: any;
}

export default function AnnadhanamListView() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { language } = useLanguage();

  const t = (en: string, ta: string) => language === 'english' ? ta : en;

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<Annadhanam[]>([]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [viewEditAnnadhanam, setViewEditAnnadhanam] = useState<Annadhanam | null>(null);
  const [isViewEditOpen, setIsViewEditOpen] = useState(false);
  const [editedAnnadhanam, setEditedAnnadhanam] = useState<Partial<AnnadhanamFormData>>({});
  // Logs modal state
  const [logsFor, setLogsFor] = useState<number | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<Array<{ id: number; action: string; created_at: string; created_by: number | null; details: any }>>([]);

  // All Logs (temple scoped) state
  const [allLogsOpen, setAllLogsOpen] = useState(false);
  const [allLogsLoading, setAllLogsLoading] = useState(false);
  const [allLogs, setAllLogs] = useState<Array<{
    id: number;
    annadhanam_id: number;
    action: string;
    created_at: string;
    created_by: number | null;
    annadhanam_name: string | null;
    receipt_number: string | null;
    details: any;
  }>>([]);
  const [allLogsTotal, setAllLogsTotal] = useState(0);
  const [allLogsPage, setAllLogsPage] = useState(1);
  const allLogsPageSize = 50;

  // Permissions disabled for this view; always show actions

  const openLogs = async (annadhanamId: number) => {
    setLogsFor(annadhanamId);
    setLogs([]);
    setLogsLoading(true);
    try {
      const res = await fetch(`https://tmsapi.xesstechlink.com/api/annadhanam/${annadhanamId}/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Failed to fetch logs: ${res.status}`);
      }
      const result = await res.json();
      console.log('Logs API Response:', result); // Debug log
      if (result.success) {
        setLogs(Array.isArray(result.data) ? result.data : []);
      } else {
        console.error('API returned error:', result.error);
        setLogs([]);
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
      setLogs([]);
      // Show user-friendly error
      alert(t('Failed to load logs. Please try again.', 'பதிவுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'));
    } finally {
      setLogsLoading(false);
    }
  };

  const closeLogs = () => {
    setLogsFor(null);
    setLogs([]);
  };

  const openAllLogs = async () => {
    setAllLogsOpen(true);
    await loadAllAnnadhanamLogs(1);
  };

  const loadAllAnnadhanamLogs = async (pageNum: number) => {
    setAllLogsLoading(true);
    try {
      const res = await fetch(`https://tmsapi.xesstechlink.com/api/annadhanam/logs?page=${pageNum}&pageSize=${allLogsPageSize}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('API Error:', res.status, errorText);
        throw new Error(`Failed to fetch logs: ${res.status}`);
      }
      const result = await res.json();
      console.log('All Logs API Response:', result); // Debug log
      if (result.success) {
        setAllLogs(Array.isArray(result.data) ? result.data : []);
        setAllLogsTotal(Number(result.total || 0));
        setAllLogsPage(pageNum);
      } else {
        console.error('API returned error:', result.error);
        throw new Error(result.error || 'Failed to load logs');
      }
    } catch (e) {
      console.error('Failed to load all logs:', e);
      setAllLogs([]);
      setAllLogsTotal(0);
      // Show user-friendly error
      alert(t('Failed to load logs. Please try again.', 'பதிவுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'));
    } finally {
      setAllLogsLoading(false);
    }
  };

  const closeAllLogs = () => {
    setAllLogsOpen(false);
    setAllLogs([]);
  };

  // Fetch annadhanam entries from API
  const fetchAnnadhanam = async () => {
    try {
      setLoading(true);

      const response = await fetch(`https://tmsapi.xesstechlink.com/api/annadhanam?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}&search=${encodeURIComponent(searchTerm)}&sort=receipt_number&order=desc`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch annadhanam data');
      }

      const result = await response.json();
      
      if (result.success) {
        // Sort entries by receipt number in descending order
        const sorted = (result.data || []).slice().sort((a, b) => {
          const aNum = parseInt((a.receipt_number || '').replace(/\D/g, '') || '0');
          const bNum = parseInt((b.receipt_number || '').replace(/\D/g, '') || '0');
          return bNum - aNum;
        });
        setData(sorted);
        // Use the pagination data from the API response
        setPagination((prev) => ({
          ...prev,
          total: result.total || sorted.length,
          totalPages: result.total_pages || Math.max(1, Math.ceil(sorted.length / prev.pageSize)),
        }));
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error) {
      console.error("Error fetching annadhanam data:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to fetch annadhanam data. Please try again.", "அன்னதானம் தரவைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
        variant: "destructive",
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // ------- Export helpers -------
  const csvEscape = (value: any) => {
    if (value === null || value === undefined) return "";
    const str = String(value).replace(/"/g, '""');
    if (/[",\n]/.test(str)) {
      return `"${str}"`;
    }
    return str;
  };

  const exportToCSV = () => {
    try {
      const headers = [
        t("Receipt No", "ரசீது எண்"),
        t("Name", "பெயர்"),
        t("Mobile", "மொபைல்"),
        t("Food Items", "உணவு பொருட்கள்"),
        t("People", "மக்கள்"),
        t("From Date", "தொடக்க தேதி"),
        t("To Date", "முடிவு தேதி"),
        t("Time", "நேரம்"),
      ];

      const rows = data.map((r) => [
        r.receipt_number,
        r.name,
        r.mobile_number,
        r.food,
        r.peoples,
        formatDate(r.from_date),
        formatDate(r.to_date),
        formatTime(r.time),
      ]);

      const csv = [headers.join(","), ...rows.map((row) => row.map(csvEscape).join(","))].join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, "-");
      link.href = url;
      link.download = `annadhanam-export-${stamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed", err);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to export CSV.", "CSV ஏற்றுமதி தோல்வியடைந்தது."),
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    try {
      const title = t("Annadhanam List", "அன்னதானம் பட்டியல்");
      const headCells = [
        t("Receipt No", "ரசீது எண்"),
        t("Name", "பெயர்"),
        t("Mobile", "மொபைல்"),
        t("Food Items", "உணவு பொருட்கள்"),
        t("People", "மக்கள்"),
        t("From Date", "தொடக்க தேதி"),
        t("To Date", "முடிவு தேதி"),
        t("Time", "நேரம்"),
      ];

      const rowsHtml = data
        .map(
          (r) => `
          <tr>
            <td>${r.receipt_number || ""}</td>
            <td>${r.name || ""}</td>
            <td>${r.mobile_number || ""}</td>
            <td>${(r.food || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
            <td style="text-align:center;">${r.peoples ?? ""}</td>
            <td>${formatDate(r.from_date) || ""}</td>
            <td>${formatDate(r.to_date) || ""}</td>
            <td>${formatTime(r.time) || ""}</td>
          </tr>`
        )
        .join("");

      const style = `
        <style>
          body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Noto Sans Tamil", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 12px 0; }
          .meta { font-size: 12px; color: #555; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
          th { background: #f5f5f5; text-align: left; }
          @media print { .no-print { display: none; } }
        </style>
      `;

      const now = new Date();
      const meta = `${t("Generated", "உருவாக்கப்பட்டது")}: ${now.toLocaleString()} | ${t("Items", "உருப்படிகள்")}: ${data.length}`;
      const html = `<!doctype html><html><head><meta charset="utf-8"/>${style}</head><body>
        <div class="no-print" style="text-align:right; margin-bottom:8px;">
          <button onclick="window.print()" style="padding:6px 10px;">${t("Print / Save as PDF", "அச்சிடு / PDF சேமி")}</button>
        </div>
        <h1>${title}</h1>
        <div class="meta">${meta}</div>
        <table>
          <thead>
            <tr>${headCells.map((h) => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body></html>`;

      const win = window.open("", "_blank");
      if (!win) throw new Error("Popup blocked");
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (err) {
      console.error("PDF export failed", err);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to export PDF.", "PDF ஏற்றுமதி தோல்வியடைந்தது."),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAnnadhanam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.pageIndex, pagination.pageSize, searchTerm]);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  };

  const handleViewClick = (annadhanam: Annadhanam) => {
    setViewEditAnnadhanam(annadhanam);
    setEditedAnnadhanam({
      name: annadhanam.name,
      mobileNumber: annadhanam.mobile_number,
      food: annadhanam.food,
      peoples: annadhanam.peoples,
      time: annadhanam.time,
      fromDate: annadhanam.from_date,
      toDate: annadhanam.to_date,
      remarks: annadhanam.remarks,
    });
    setIsViewEditOpen(true);
  };

  const handleEditClick = (annadhanam: Annadhanam) => {
    // Redirect to the dedicated edit page which handles loading and updating
    // the annadhanam entry using the provided id.
    navigate(`/dashboard/annadhanam/edit/${annadhanam.id}`);
  };


  const isLastReceipt = (receipt: Annadhanam) => {
    if (!data.length) return false;
    const sortedReceipts = [...data].sort((a, b) => {
      const aNum = parseInt((a.receipt_number || '').replace(/\D/g, '') || '0');
      const bNum = parseInt((b.receipt_number || '').replace(/\D/g, '') || '0');
      return bNum - aNum;
    });
    return sortedReceipts[0].id === receipt.id;
  };

  const handleDeleteClick = (id: number) => {
    const receipt = data.find(r => r.id === id);
    if (!receipt || !isLastReceipt(receipt)) {
      toast({
        title: t("Error", "பிழை"),
        description: t("Only the last receipt can be deleted", "கடைசி ரசீதை மட்டுமே நீக்க முடியும்"),
        variant: "destructive",
      });
      return;
    }
    setDeleteId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`https://tmsapi.xesstechlink.com/api/annadhanam/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete annadhanam');
      }

      const result = await response.json();

      if (result.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
        // Adjust pagination totals to reflect removal
        setPagination((prev) => {
          const newTotal = Math.max(0, prev.total - 1);
          const newTotalPages = Math.max(1, Math.ceil(newTotal / prev.pageSize));
          const newPageIndex = Math.min(prev.pageIndex, newTotalPages - 1);
          return { ...prev, total: newTotal, totalPages: newTotalPages, pageIndex: newPageIndex };
        });

        toast({
          title: t("Success", "வெற்றி"),
          description: t("Annadhanam deleted successfully", "அன்னதானம் வெற்றிகரமாக நீக்கப்பட்டது"),
        });
      } else {
        throw new Error(result.error || 'Failed to delete annadhanam');
      }
    } catch (error) {
      console.error("Error deleting annadhanam:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to delete annadhanam. Please try again.", "அன்னதானத்தை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
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
          <div />

        </div>

        {/* Table Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Search + Export Toolbar */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t("Search by name, receipt number, or mobile...", "பெயர், ரசீது எண் அல்லது மொபைல் மூலம் தேடவும்...")}
                  className="pl-9 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleSearch}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={openAllLogs}
                >
                  {t("All Logs", "அனைத்து பதிவுகள்")}
                </Button>
                <Button variant="outline" onClick={exportToCSV} disabled={loading || data.length === 0}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {t("Export CSV", "CSV ஏற்றுமதி")}
                </Button>
                <Button variant="outline" onClick={exportToPDF} disabled={loading || data.length === 0}>
                  <FileDown className="h-4 w-4 mr-2" />
                  {t("Export PDF", "PDF ஏற்றுமதி")}
                </Button>
              </div>
            </div>

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
                      <TableHead>{t("Receipt No", "ரசீது எண்")}</TableHead>
                      <TableHead>{t("Name", "பெயர்")}</TableHead>
                      <TableHead>{t("Mobile", "மொபைல்")}</TableHead>
                      <TableHead>{t("Food Items", "உணவு பொருட்கள்")}</TableHead>
                      <TableHead className="text-center">{t("People", "மக்கள்")}</TableHead>
                      <TableHead>{t("Date Range", "தேதி வரம்பு")}</TableHead>
                      <TableHead>{t("Time", "நேரம்")}</TableHead>
                      <TableHead className="text-right">{t("Actions", "செயல்கள்")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length > 0 ? (
                      data.map((annadhanam) => (
                        <TableRow key={annadhanam.id}>
                          <TableCell className="font-medium">
                            {annadhanam.receipt_number}
                          </TableCell>
                          <TableCell>{annadhanam.name}</TableCell>
                          <TableCell>{annadhanam.mobile_number}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {annadhanam.food}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <Users className="h-4 w-4 mr-1" />
                              {annadhanam.peoples}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <div className="text-sm">
                                <div>{formatDate(annadhanam.from_date)}</div>
                                {annadhanam.from_date !== annadhanam.to_date && (
                                  <div className="text-muted-foreground">
                                    {t("to", "வரை")} {formatDate(annadhanam.to_date)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatTime(annadhanam.time)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewClick(annadhanam)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openLogs(annadhanam.id)}
                                title={t("Logs", "பதிவுகள்")}
                              >
                                {t("Logs", "பதிவுகள்")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(annadhanam)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(annadhanam.id)}
                                disabled={!isLastReceipt(annadhanam)}
                                title={!isLastReceipt(annadhanam) ? t("Only the last receipt can be deleted", "கடைசி ரசீதை மட்டுமே நீக்க முடியும்") : ""}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          {t("No annadhanam entries found", "அன்னதானம் பதிவுகள் எதுவும் கிடைக்கவில்லை")}
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


        {/* View Modal */}
        <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {t("View Annadhanam", "அன்னதானத்தை பார்க்க")}
              </DialogTitle>
              <DialogDescription>
                {t("View the annadhanam details below", "கீழே உள்ள அன்னதான விவரங்களை பார்க்கவும்")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  {t("Name", "பெயர்")}
                </Label>
                <Input
                  id="name"
                  value={editedAnnadhanam.name || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, name: e.target.value })
                  }
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="mobileNumber" className="text-right">
                  {t("Mobile Number", "மொபைல் எண்")}
                </Label>
                <Input
                  id="mobileNumber"
                  value={editedAnnadhanam.mobileNumber || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, mobileNumber: e.target.value })
                  }
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="food" className="text-right">
                  {t("Food Items", "உணவு பொருட்கள்")}
                </Label>
                <Textarea
                  id="food"
                  value={editedAnnadhanam.food || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, food: e.target.value })
                  }
                  className="col-span-3"
                  disabled
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="peoples" className="text-right">
                  {t("Number of People", "மக்கள் எண்ணிக்கை")}
                </Label>
                <Input
                  id="peoples"
                  type="number"
                  value={editedAnnadhanam.peoples || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, peoples: parseInt(e.target.value) })
                  }
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="time" className="text-right">
                  {t("Time", "நேரம்")}
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={editedAnnadhanam.time || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, time: e.target.value })
                  }
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fromDate" className="text-right">
                  {t("From Date", "தொடக்க தேதி")}
                </Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={editedAnnadhanam.fromDate || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, fromDate: e.target.value })
                  }
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="toDate" className="text-right">
                  {t("To Date", "முடிவு தேதி")}
                </Label>
                <Input
                  id="toDate"
                  type="date"
                  value={editedAnnadhanam.toDate || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, toDate: e.target.value })
                  }
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="remarks" className="text-right">
                  {t("Remarks", "குறிப்புகள்")}
                </Label>
                <Textarea
                  id="remarks"
                  value={editedAnnadhanam.remarks || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, remarks: e.target.value })
                  }
                  className="col-span-3"
                  disabled
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsViewEditOpen(false);
                  setViewEditAnnadhanam(null);
                  setEditedAnnadhanam({});
                }}
              >
                {t("Cancel", "ரத்து செய்")}
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => navigate('/dashboard/annadhanam/entry')}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                {t("New Entry", "புதிய பதிவு")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Are you sure?", "நீங்கள் உறுதியாகவா?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("This action cannot be undone. This will permanently delete the annadhanam entry and remove all associated data.", "இந்த செயலை திரும்பப் பெற முடியாது. இது அன்னதானம் பதிவை நிரந்தரமாக நீக்கி அனைத்து தொடர்புடைய தரவுகளையும் அகற்றும்.")}
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

        {/* All Logs Modal */}
        {allLogsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closeAllLogs} />
            <div className="relative bg-white rounded shadow-lg w-full max-w-5xl mx-2 p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">{t('All Annadhanam Logs', 'அனைத்து அன்னதானம் பதிவுகள்')}</h2>
                <button onClick={closeAllLogs} className="text-xs px-2 py-1 border rounded">{t('Close', 'மூடு')}</button>
              </div>
              {allLogsLoading ? (
                <div className="p-3 text-xs text-gray-600">{t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}</div>
              ) : (
                <>
                  <div className="max-h-[70vh] overflow-y-auto border rounded">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1">{t('Time', 'நேரம்')}</th>
                          <th className="text-left px-2 py-1">{t('Action', 'செயல்')}</th>
                          <th className="text-left px-2 py-1">{t('Annadhanam ID', 'அன்னதானம் ஐடி')}</th>
                          <th className="text-left px-2 py-1">{t('Name', 'பெயர்')}</th>
                          <th className="text-left px-2 py-1">{t('Receipt No', 'ரசீது எண்')}</th>
                          <th className="text-left px-2 py-1">{t('User', 'பயனர்')}</th>
                          <th className="text-left px-2 py-1">{t('Details', 'விவரங்கள்')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allLogs.length === 0 ? (
                          <tr>
                            <td className="px-2 py-2 text-center text-gray-500" colSpan={7}>{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</td>
                          </tr>
                        ) : allLogs.map((lg) => (
                          <tr key={lg.id} className="border-t align-top">
                            <td className="px-2 py-1 whitespace-nowrap">{lg.created_at ? new Date(lg.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}</td>
                            <td className="px-2 py-1">{lg.action}</td>
                            <td className="px-2 py-1">{lg.annadhanam_id}</td>
                            <td className="px-2 py-1">{lg.annadhanam_name ?? '-'}</td>
                            <td className="px-2 py-1">{lg.receipt_number ?? '-'}</td>
                            <td className="px-2 py-1">{lg.created_by ?? '-'}</td>
                            <td className="px-2 py-1"><pre className="whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border max-w-[40vw]">{JSON.stringify(lg.details, null, 2)}</pre></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <div className="text-gray-700">{t('Total', 'மொத்தம்')}: <span className="font-medium">{allLogsTotal}</span></div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2 py-1 border border-gray-300 rounded shadow-sm text-xs bg-white hover:bg-gray-50"
                        disabled={allLogsPage <= 1}
                        onClick={() => loadAllAnnadhanamLogs(allLogsPage - 1)}
                      >
                        {t('Previous', 'முந்தைய')}
                      </button>
                      <span>{t('Page', 'பக்கம்')} {allLogsPage}</span>
                      <button
                        className="px-2 py-1 border border-gray-300 rounded shadow-sm text-xs bg-white hover:bg-gray-50"
                        disabled={allLogsPage * allLogsPageSize >= allLogsTotal}
                        onClick={() => loadAllAnnadhanamLogs(allLogsPage + 1)}
                      >
                        {t('Next', 'அடுத்தது')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {logsFor !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closeLogs} />
            <div className="relative bg-white rounded shadow-lg w-full max-w-4xl mx-2 p-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold">{t('Annadhanam Logs', 'அன்னதானம் பதிவுகள்')} #{logsFor}</h2>
                <button onClick={closeLogs} className="text-xs px-2 py-1 border rounded">{t('Close', 'மூடு')}</button>
              </div>
              {logsLoading ? (
                <div className="p-3 text-xs text-gray-600">{t('Loading logs...', 'பதிவுகள் ஏறுகிறது...')}</div>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto border rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-2 py-1">{t('Time', 'நேரம்')}</th>
                        <th className="text-left px-2 py-1">{t('Action', 'செயல்')}</th>
                        <th className="text-left px-2 py-1">{t('User', 'பயனர்')}</th>
                        <th className="text-left px-2 py-1">{t('Details', 'விவரங்கள்')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr><td colSpan={4} className="px-2 py-2 text-center text-gray-500">{t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}</td></tr>
                      ) : logs.map(lg => (
                        <tr key={lg.id} className="border-t align-top">
                          <td className="px-2 py-1 whitespace-nowrap">{lg.created_at ? new Date(lg.created_at).toLocaleString(language === 'tamil' ? 'ta-IN' : 'en-IN') : '-'}</td>
                          <td className="px-2 py-1">{lg.action}</td>
                          <td className="px-2 py-1">{lg.created_by ?? '-'}</td>
                          <td className="px-2 py-1">
                            <pre className="whitespace-pre-wrap break-words text-[10px] bg-gray-50 p-2 rounded border max-w-[40vw]">{JSON.stringify(lg.details, null, 2)}</pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
