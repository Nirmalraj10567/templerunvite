import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, PlusCircle, Loader2, Eye, Edit, Trash2, Calendar, Users, Clock, FileDown, FileSpreadsheet } from "lucide-react";
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
import { cn, pageContainerStyles, formFieldStyles } from "@/styles/formStyles";

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

  // User names and details for logs
  const [userNames, setUserNames] = useState<Record<number, string>>({});
  const [userDetails, setUserDetails] = useState<Record<number, {name: string, username?: string, mobile?: string}>>({});

  // Permissions disabled for this view; always show actions

  // Fetch user names/details for given ids (per-id endpoint, resilient)
  const fetchUserNames = async (userIds: number[]) => {
    const uniqueIds = Array.from(new Set(userIds.filter((v): v is number => typeof v === 'number')));
    if (uniqueIds.length === 0) return;
    // Skip ids we already have
    const missing = uniqueIds.filter((id) => !userDetails[id] && !userNames[id]);
    if (missing.length === 0) return;
    console.log('Fetching user profiles for IDs (per-id):', missing);
    const results = await Promise.all(
      missing.map(async (id) => {
        try {
          const res = await fetch(`http://localhost:4000/api/admin/members/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            console.warn('Failed to fetch member by id', id, data);
            return null;
          }
          const u = data?.data?.user || data?.data; // support both shapes
          if (!u) return null;
          const fullName = (u.full_name && String(u.full_name).trim()) || u.username || u.mobile || String(id);
          return { id, name: fullName, username: u.username, mobile: u.mobile } as { id: number; name: string; username?: string; mobile?: string };
        } catch (err) {
          console.warn('Error fetching member id', id, err);
          return null;
        }
      })
    );
    const nameMap: Record<number, string> = {};
    const detailsMap: Record<number, { name: string; username?: string; mobile?: string }> = {};
    results.forEach((r) => {
      if (!r) return;
      nameMap[r.id] = r.name;
      detailsMap[r.id] = { name: r.name, username: r.username, mobile: r.mobile };
    });
    if (Object.keys(nameMap).length > 0) {
      setUserNames((prev) => ({ ...prev, ...nameMap }));
      setUserDetails((prev) => ({ ...prev, ...detailsMap }));
      console.log('Updated user maps from per-id fetch:', { nameMap, detailsMap });
    }
  };

  const openLogs = async (annadhanamId: number) => {
    setLogsFor(annadhanamId);
    setLogs([]);
    setLogsLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/annadhanam/${annadhanamId}/logs`, {
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
        const logsData = Array.isArray(result.data) ? result.data : [];
        setLogs(logsData);
        
        // Fetch user names for the logs
        const userIds = logsData
          .map(log => log.created_by)
          .filter((id): id is number => id !== null && id !== undefined);
        console.log('openLogs - Found userIds:', userIds);
        if (userIds.length > 0) {
          console.log('openLogs - Calling fetchUserNames with:', userIds);
          await fetchUserNames(userIds);
        } else {
          console.log('openLogs - No userIds found, skipping fetchUserNames');
        }
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
      const res = await fetch(`http://localhost:4000/api/annadhanam/logs?page=${pageNum}&pageSize=${allLogsPageSize}`, {
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
        const logsData = Array.isArray(result.data) ? result.data : [];
        setAllLogs(logsData);
        setAllLogsTotal(Number(result.total || 0));
        setAllLogsPage(pageNum);
        
        // Fetch user names for the logs
        const userIds = logsData
          .map(log => log.created_by)
          .filter((id): id is number => id !== null && id !== undefined);
        console.log('loadAllLogs - Found userIds:', userIds);
        if (userIds.length > 0) {
          console.log('loadAllLogs - Calling fetchUserNames with:', userIds);
          await fetchUserNames(userIds);
        } else {
          console.log('loadAllLogs - No userIds found, skipping fetchUserNames');
        }
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

      const response = await fetch(`http://localhost:4000/api/annadhanam?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}&search=${encodeURIComponent(searchTerm)}&sort=receipt_number&order=desc`, {
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
      const response = await fetch(`http://localhost:4000/api/annadhanam/${deleteId}`, {
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
    <div className={pageContainerStyles.container}>
      <Card className={pageContainerStyles.content}>
        <CardHeader className={cn("bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 px-6 text-center", formFieldStyles.card.header)}>
          <CardTitle className="text-lg font-bold w-full">
            {t("Annadhanam List", "அன்னதானம் பதிவு")}
          </CardTitle>
        </CardHeader>

        {/* Table Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Search + Export Toolbar */}
            <div className={formFieldStyles.moneyDonationList.filters.container}>
              <div className={formFieldStyles.moneyDonationList.filters.form}>
                <div className={formFieldStyles.moneyDonationList.filters.searchContainer}>
                  <div className={formFieldStyles.moneyDonationList.filters.searchIcon}>
                    <Search className={formFieldStyles.moneyDonationList.filters.searchIconSvg} />
                  </div>
                  <Input
                    type="search"
                    placeholder={t("Search by name, receipt number, or mobile...", "பெயர், ரசீது எண் அல்லது மொபைல் மூலம் தேடவும்...")}
                    className={formFieldStyles.moneyDonationList.filters.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearch}
                  />
                </div>
                <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
                  <Button 
                    variant="outline" 
                    onClick={openAllLogs}
                    className={formFieldStyles.moneyDonationList.filters.button}
                  >
                    {t("All Logs", "அனைத்து பதிவுகள்")}
                  </Button>
                  <Button variant="outline" onClick={exportToCSV} disabled={loading || data.length === 0} className={formFieldStyles.moneyDonationList.filters.button}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {t("Export CSV", "CSV ஏற்றுமதி")}
                  </Button>
                  <Button variant="outline" onClick={exportToPDF} disabled={loading || data.length === 0} className={formFieldStyles.moneyDonationList.filters.button}>
                    <FileDown className="h-4 w-4 mr-2" />
                    {t("Export PDF", "PDF ஏற்றுமதி")}
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className={formFieldStyles.moneyDonationList.table.container}>
              <div className={formFieldStyles.moneyDonationList.table.scrollContainer}>
                {loading ? (
                  <div className={formFieldStyles.moneyDonationList.table.loadingCell}>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table className={formFieldStyles.moneyDonationList.table.table}>
                    <TableHeader className={formFieldStyles.moneyDonationList.table.thead}>
                      <TableRow className="border-b border-gray-200">
                        <TableHead className={cn(formFieldStyles.moneyDonationList.table.th, formFieldStyles.moneyDonationList.table.thLeft)}>{t("Receipt No", "ரசீது எண்")}</TableHead>
                        <TableHead className={formFieldStyles.moneyDonationList.table.th}>{t("Name", "பெயர்")}</TableHead>
                        <TableHead className={formFieldStyles.moneyDonationList.table.th}>{t("Mobile", "மொபைல்")}</TableHead>
                        <TableHead className={formFieldStyles.moneyDonationList.table.th}>{t("Food Items", "உணவு பொருட்கள்")}</TableHead>
                        <TableHead className={cn(formFieldStyles.moneyDonationList.table.th, formFieldStyles.moneyDonationList.table.thCenter)}>{t("People", "மக்கள்")}</TableHead>
                        <TableHead className={formFieldStyles.moneyDonationList.table.th}>{t("Date Range", "தேதி வரம்பு")}</TableHead>
                        <TableHead className={formFieldStyles.moneyDonationList.table.th}>{t("Time", "நேரம்")}</TableHead>
                        <TableHead className={cn(formFieldStyles.moneyDonationList.table.th, formFieldStyles.moneyDonationList.table.thRight)}>{t("Actions", "செயல்கள்")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className={formFieldStyles.moneyDonationList.table.tbody}>
                    {data.length > 0 ? (
                      data.map((annadhanam) => (
                        <TableRow key={annadhanam.id} className={formFieldStyles.moneyDonationList.table.tr}>
                          <TableCell className={formFieldStyles.moneyDonationList.table.td}>
                            {annadhanam.receipt_number}
                          </TableCell>
                          <TableCell className={formFieldStyles.moneyDonationList.table.td}>{annadhanam.name}</TableCell>
                          <TableCell className={formFieldStyles.moneyDonationList.table.td}>{annadhanam.mobile_number}</TableCell>
                          <TableCell className={cn(formFieldStyles.moneyDonationList.table.td, "max-w-xs truncate")}>
                            {annadhanam.food}
                          </TableCell>
                          <TableCell className={cn(formFieldStyles.moneyDonationList.table.td, formFieldStyles.moneyDonationList.table.tdCenter)}>
                            <div className="flex items-center justify-center">
                              <Users className="h-4 w-4 mr-1" />
                              {annadhanam.peoples}
                            </div>
                          </TableCell>
                          <TableCell className={formFieldStyles.moneyDonationList.table.td}>
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
                          <TableCell className={formFieldStyles.moneyDonationList.table.td}>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatTime(annadhanam.time)}
                            </div>
                          </TableCell>
                          <TableCell className={cn(formFieldStyles.moneyDonationList.table.td, formFieldStyles.moneyDonationList.table.tdRight)}>
                            <div className={formFieldStyles.moneyDonationList.actionButtons.container}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewClick(annadhanam)}
                                className={formFieldStyles.moneyDonationList.actionButtons.print}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openLogs(annadhanam.id)}
                                title={t("Logs", "பதிவுகள்")}
                                className={formFieldStyles.moneyDonationList.actionButtons.logs}
                              >
                                {t("Logs", "பதிவுகள்")}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(annadhanam)}
                                className={formFieldStyles.moneyDonationList.actionButtons.edit}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(annadhanam.id)}
                                disabled={!isLastReceipt(annadhanam)}
                                title={!isLastReceipt(annadhanam) ? t("Only the last receipt can be deleted", "கடைசி ரசீதை மட்டுமே நீக்க முடியும்") : ""}
                                className={!isLastReceipt(annadhanam) ? formFieldStyles.moneyDonationList.actionButtons.deleteDisabled : formFieldStyles.moneyDonationList.actionButtons.delete}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className={formFieldStyles.moneyDonationList.table.emptyCell}>
                          {t("No annadhanam entries found", "அன்னதானம் பதிவுகள் எதுவும் கிடைக்கவில்லை")}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              </div>

              {/* Pagination */}
              <div className={formFieldStyles.moneyDonationList.summary.container}>
                <div className={formFieldStyles.moneyDonationList.summary.info}>
                  {t("Showing", "காட்டப்படுகிறது")} {data.length} {t("of", "இல்")}{" "}
                  <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{pagination.total}</span> {t("items", "உருப்படிகள்")}
                </div>
                <div className={formFieldStyles.moneyDonationList.pagination.controls}>
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
                    className={formFieldStyles.moneyDonationList.pagination.button}
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
                    className={formFieldStyles.moneyDonationList.pagination.button}
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
          <div className={formFieldStyles.moneyDonationList.modal.overlay}>
            <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeAllLogs} />
            <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl mx-4 max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-6 px-6 rounded-t-lg flex-shrink-0">
                <div className={formFieldStyles.moneyDonationList.modal.header}>
                  <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('All Annadhanam Logs', 'அனைத்து அன்னதானம் பதிவுகள்')}</h2>
                  <button onClick={closeAllLogs} className={formFieldStyles.moneyDonationList.modal.closeButton}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-hidden">
                  {allLogsLoading ? (
                    <div className={formFieldStyles.moneyDonationList.modal.loading}>
                      {t('Loading logs...', 'பதிவுகள் ஏற்றப்படுகிறது...')}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col">
                      <div className="flex-1 overflow-auto">
                        <div className="bg-white border border-gray-200">
                          <table className={formFieldStyles.moneyDonationList.logsTable.table}>
                            <thead className={formFieldStyles.moneyDonationList.logsTable.thead}>
                              <tr>
                                <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                  {t('Action', 'செயல்')}
                                </th>
                                <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                  {t('Date & Time', 'தேதி மற்றும் நேரம்')}
                                </th>
                                <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                  {t('Annadhanam ID', 'அன்னதானம் ஐடி')}
                                </th>
                                <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                  {t('Name', 'பெயர்')}
                                </th>
                                <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                  {t('Receipt No', 'ரசீது எண்')}
                                </th>
                                <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                  {t('User', 'பயனர்')}
                                </th>
                                <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                                  {t('Details', 'விவரங்கள்')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className={formFieldStyles.moneyDonationList.logsTable.tbody}>
                              {allLogs.length === 0 ? (
                                <tr>
                                  <td className={formFieldStyles.moneyDonationList.logsTable.tdCenter} colSpan={7}>
                                    {t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}
                                  </td>
                                </tr>
                              ) : allLogs.map((lg, index) => (
                                <tr key={lg.id} className={formFieldStyles.moneyDonationList.logsTable.tr}>
                                  <td className={formFieldStyles.moneyDonationList.logsTable.td}>
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
                                  </td>
                                  <td className={formFieldStyles.moneyDonationList.logsTable.tdNowrap}>
                                    {lg.created_at ? new Date(lg.created_at).toLocaleString('en-IN', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : '-'}
                                  </td>
                                  <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.annadhanam_id}</td>
                                  <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.annadhanam_name ?? '-'}</td>
                                  <td className={formFieldStyles.moneyDonationList.logsTable.td}>{lg.receipt_number ?? '-'}</td>
                                  <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                    {(() => {
                                      const userId = lg.created_by;
                                      if (!userId) return '-';
                                      const user = userDetails[userId];
                                      const name = userNames[userId];
                                      
                                      if (user?.username) {
                                        return `@${user.username}`;
                                      }
                                      if (user?.name) {
                                        return user.name;
                                      }
                                      if (name) {
                                        return name;
                                      }
                                      return `User ${userId}`;
                                    })()}
                                  </td>
                                  <td className="py-3 px-4 border-b">
                                    <div className="text-sm text-gray-600 max-w-md">
                                      {(() => {
                                        // Parse donation details from the log data
                                        const details = lg.details;
                                        if (!details) return <span className="text-gray-400">-</span>;
                                        
                                        // Check if this is an annadhanam entry with food field
                                        const food = details.food || details.after?.food || details.before?.food;
                                        if (!food) return <span className="text-gray-400">-</span>;
                                        
                                        // Parse different donation types
                                        if (food.startsWith('Money:')) {
                                          const amount = food.replace('Money:', '').trim();
                                          return (
                                            <div className="space-y-2">
                                              <div className="bg-green-50 p-2 rounded border text-xs">
                                                <div className="font-medium text-green-700 mb-1">{t('Money Donation', 'பண தானம்')}</div>
                                                <div className="text-gray-600">₹{amount}</div>
                                              </div>
                                            </div>
                                          );
                                        } else if (food.startsWith('Product:')) {
                                          const productInfo = food.replace('Product:', '').trim();
                                          const parts = productInfo.split('|').map(p => p.trim());
                                          const productName = parts[0];
                                          const qtyPart = parts.find(p => /qty/i.test(p));
                                          const quantity = qtyPart ? qtyPart.replace(/qty\s*[:]?/i, '').trim() : '';
                                          
                                          return (
                                            <div className="space-y-2">
                                              <div className="bg-blue-50 p-2 rounded border text-xs">
                                                <div className="font-medium text-blue-700 mb-1">{t('Product Donation', 'பொருள் தானம்')}</div>
                                                <div className="text-gray-600">{productName}</div>
                                                {quantity && <div className="text-gray-500">Qty: {quantity}</div>}
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          // Regular food donation
                                          return (
                                            <div className="space-y-2">
                                              <div className="bg-orange-50 p-2 rounded border text-xs">
                                                <div className="font-medium text-orange-700 mb-1">{t('Food Donation', 'உணவு தானம்')}</div>
                                                <div className="text-gray-600">{food}</div>
                                              </div>
                                            </div>
                                          );
                                        }
                                      })()}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className={formFieldStyles.moneyDonationList.pagination.container}>
                        <div className={formFieldStyles.moneyDonationList.pagination.info}>
                          {t('Total', 'மொத்தம்')}: <span className={formFieldStyles.moneyDonationList.summary.fontMedium}>{allLogsTotal}</span>
                        </div>
                        <div className={formFieldStyles.moneyDonationList.pagination.controls}>
                          <button
                            className={formFieldStyles.moneyDonationList.pagination.button}
                            disabled={allLogsPage <= 1}
                            onClick={() => loadAllAnnadhanamLogs(allLogsPage - 1)}
                          >
                            {t('Previous', 'முந்தைய')}
                          </button>
                          <span className="text-sm text-gray-600">{t('Page', 'பக்கம்')} {allLogsPage}</span>
                          <button
                            className={formFieldStyles.moneyDonationList.pagination.button}
                            disabled={allLogsPage * allLogsPageSize >= allLogsTotal}
                            onClick={() => loadAllAnnadhanamLogs(allLogsPage + 1)}
                          >
                            {t('Next', 'அடுத்தது')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {logsFor !== null && (
          <div className={formFieldStyles.moneyDonationList.modal.overlay}>
            <div className={formFieldStyles.moneyDonationList.modal.backdrop} onClick={closeLogs} />
            <div className={formFieldStyles.moneyDonationList.modal.container}>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-6 px-6 rounded-t-lg">
                <div className={formFieldStyles.moneyDonationList.modal.header}>
                  <h2 className={formFieldStyles.moneyDonationList.modal.title}>{t('Activity Log', 'செயல்பாட்டு பதிவு')} #{logsFor}</h2>
                  <button onClick={closeLogs} className={formFieldStyles.moneyDonationList.modal.closeButton}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {logsLoading ? (
                    <div className={formFieldStyles.moneyDonationList.modal.loading}>
                      {t('Loading logs...', 'பதிவுகள் ஏறுகிறது...')}
                    </div>
                  ) : logs.length === 0 ? (
                    <div className={formFieldStyles.moneyDonationList.modal.loading}>
                      {t('No logs found', 'பதிவுகள் கிடைக்கவில்லை')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className={formFieldStyles.moneyDonationList.logsTable.table}>
                        <thead className={formFieldStyles.moneyDonationList.logsTable.thead}>
                          <tr>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {t('Action', 'செயல்')}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {t('Date & Time', 'தேதி மற்றும் நேரம்')}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {t('User', 'பயனர்')}
                            </th>
                            <th className={formFieldStyles.moneyDonationList.logsTable.th}>
                              {t('Details', 'விவரங்கள்')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className={formFieldStyles.moneyDonationList.logsTable.tbody}>
                          {logs.map((lg, index) => (
                            <tr key={lg.id} className={formFieldStyles.moneyDonationList.logsTable.tr}>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>
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
                              </td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.tdNowrap}>
                                {lg.created_at ? new Date(lg.created_at).toLocaleString('en-IN', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                              </td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                {(() => {
                                  const userId = lg.created_by;
                                  if (!userId) return '-';
                                  const user = userDetails[userId];
                                  const name = userNames[userId];
                                  
                                  if (user?.username) {
                                    return `@${user.username}`;
                                  }
                                  if (user?.name) {
                                    return user.name;
                                  }
                                  if (name) {
                                    return name;
                                  }
                                  return `User ${userId}`;
                                })()}
                              </td>
                              <td className={formFieldStyles.moneyDonationList.logsTable.td}>
                                <div className="text-sm text-gray-600 max-w-md">
                                  {(() => {
                                    // Parse donation details from the log data
                                    const details = lg.details;
                                    if (!details) return <span className="text-gray-400">-</span>;
                                    
                                    // Check if this is an annadhanam entry with food field
                                    const food = details.food || details.after?.food || details.before?.food;
                                    if (!food) return <span className="text-gray-400">-</span>;
                                    
                                    // Parse different donation types
                                    if (food.startsWith('Money:')) {
                                      const amount = food.replace('Money:', '').trim();
                                      return (
                                        <div className="space-y-2">
                                          <div className="bg-green-50 p-2 rounded border text-xs">
                                            <div className="font-medium text-green-700 mb-1">{t('Money Donation', 'பண தானம்')}</div>
                                            <div className="text-gray-600">₹{amount}</div>
                                          </div>
                                        </div>
                                      );
                                    } else if (food.startsWith('Product:')) {
                                      const productInfo = food.replace('Product:', '').trim();
                                      const parts = productInfo.split('|').map(p => p.trim());
                                      const productName = parts[0];
                                      const qtyPart = parts.find(p => /qty/i.test(p));
                                      const quantity = qtyPart ? qtyPart.replace(/qty\s*[:]?/i, '').trim() : '';
                                      
                                      return (
                                        <div className="space-y-2">
                                          <div className="bg-blue-50 p-2 rounded border text-xs">
                                            <div className="font-medium text-blue-700 mb-1">{t('Product Donation', 'பொருள் தானம்')}</div>
                                            <div className="text-gray-600">{productName}</div>
                                            {quantity && <div className="text-gray-500">Qty: {quantity}</div>}
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      // Regular food donation
                                      return (
                                        <div className="space-y-2">
                                          <div className="bg-orange-50 p-2 rounded border text-xs">
                                            <div className="font-medium text-orange-700 mb-1">{t('Food Donation', 'உணவு தானம்')}</div>
                                            <div className="text-gray-600">{food}</div>
                                          </div>
                                        </div>
                                      );
                                    }
                                  })()}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
