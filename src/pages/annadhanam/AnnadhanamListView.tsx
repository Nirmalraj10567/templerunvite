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
import { theme, tableClasses, buttonClasses } from '@/styles/theme';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiClient from "@/lib/apiClient";

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

  const t = (en: string, ta: string) => (language === 'tamil' ? en : ta);

  const normalizeDateString = (s?: string) => {
    if (!s) return '';
    return s.slice(0, 10);
  };

  const normalizeTimeString = (s?: string) => {
    if (!s) return '';
    const hm = s.match(/^\d{2}:\d{2}(:\d{2})?$/);
    if (hm) return s.slice(0, 5);
    const ampm = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (ampm) {
      let h = parseInt(ampm[1], 10);
      const m = ampm[2];
      const ap = ampm[3].toUpperCase();
      if (ap === 'PM' && h !== 12) h += 12;
      if (ap === 'AM' && h === 12) h = 0;
      const hh = String(h).padStart(2, '0');
      return `${hh}:${m}`;
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    return '';
  };


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
  const [userDetails, setUserDetails] = useState<Record<number, { name: string, username?: string, mobile?: string }>>({});

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
          const res = await fetch(`https://templeapi.agniplay.com/api/admin/members/${id}`, {
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
      const res = await fetch(`https://templeapi.agniplay.com/api/annadhanam/${annadhanamId}/logs`, {
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
      const res = await fetch(`https://templeapi.agniplay.com/api/annadhanam/logs?page=${pageNum}&pageSize=${allLogsPageSize}`, {
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

      const response = await fetch(`https://templeapi.agniplay.com/api/annadhanam?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}&search=${encodeURIComponent(searchTerm)}&sort=receipt_number&order=desc`, {
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
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
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
      t("S.No", "எண்"),
      t("Receipt No", "ரசீது எண்"),
      t("Name", "பெயர்"),
      t("Mobile", "மொபைல்"),
      t("Food Items", "உணவு பொருட்கள்"),
      t("People", "மக்கள்"),
      t("From Date", "தொடக்க தேதி"),
      t("To Date", "முடிவு தேதி"),
      t("Time", "நேரம்"),
    ];

    const rows = data.map((r, index) => [
      index + 1,
      r.receipt_number || "",
      r.name || "",
      r.mobile_number || "",
      r.food || "",
      r.peoples ?? "",
      formatDate(r.from_date) || "",
      formatDate(r.to_date) || "",
      formatTime(r.time) || "",
    ]);

    const doc = new jsPDF("landscape");
    const pageWidth = doc.internal.pageSize.getWidth();
    const now = new Date();
    const templeName = (user as any)?.templeName || "Temple";

    /* =========================================================
       🎨 MODERN HEADER
    ========================================================= */

    // Top Accent Line
    doc.setDrawColor(204, 85, 0);
    doc.setLineWidth(2);
    doc.line(10, 12, pageWidth - 10, 12);

    // Temple Name (Left)
    doc.setFontSize(24);
    doc.setTextColor(204, 85, 0);
    doc.setFont(undefined, "bold");
    doc.text(templeName, 14, 25);

    // Subtitle
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.setFont(undefined, "normal");
    doc.text("Annadhanam Management System", 14, 31);

    // Title (Right)
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, "bold");
    doc.text(title, pageWidth - 14, 25, { align: "right" });

    // Meta Info
    doc.setFontSize(9);
    doc.setTextColor(130, 130, 130);
    doc.setFont(undefined, "normal");

    doc.text(
      `${t("Generated", "உருவாக்கப்பட்டது")}: ${now.toLocaleDateString()}`,
      pageWidth - 14,
      32,
      { align: "right" }
    );

    doc.text(
      `${t("Records", "பதிவுகள்")}: ${data.length}`,
      pageWidth - 14,
      38,
      { align: "right" }
    );

    // Divider
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(10, 42, pageWidth - 10, 42);

    /* =========================================================
       📊 SUMMARY
    ========================================================= */

    const totalPeople = data.reduce(
      (sum, r) => sum + (Number(r.peoples) || 0),
      0
    );

    doc.setFillColor(248, 248, 248);
    doc.roundedRect(10, 46, pageWidth - 20, 12, 3, 3, "F");

    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont(undefined, "bold");

    doc.text(
      `${t("Total People", "மொத்த மக்கள்")}: ${totalPeople}`,
      14,
      54
    );

    doc.text(
      `${t("Total Records", "மொத்த பதிவுகள்")}: ${data.length}`,
      pageWidth - 14,
      54,
      { align: "right" }
    );

    /* =========================================================
       📋 TABLE
    ========================================================= */

    autoTable(doc, {
      head: [headCells],
      body: rows,
      startY: 62,

      styles: {
        fontSize: 8.5,
        cellPadding: 4,
        valign: "middle",
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },

      headStyles: {
        fillColor: [204, 85, 0],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },

      alternateRowStyles: {
        fillColor: [252, 252, 252],
      },

      columnStyles: {
        0: { cellWidth: 15, halign: "center", fontStyle: "bold" },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 45 },
        3: { cellWidth: 35, halign: "center" },
        4: { cellWidth: 45 },
        5: { cellWidth: 25, halign: "center" },
        6: { cellWidth: 30, halign: "center" },
        7: { cellWidth: 30, halign: "center" },
        8: { cellWidth: 25, halign: "center" },
      },

      margin: { top: 62, left: 10, right: 10, bottom: 25 },

      didDrawPage: (dataArg) => {
        const pageHeight = doc.internal.pageSize.getHeight();

        // Footer Line
        doc.setDrawColor(200);
        doc.line(10, pageHeight - 18, pageWidth - 10, pageHeight - 18);

        // Footer Left
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.setFont(undefined, "bold");
        doc.text(templeName, 10, pageHeight - 10);

        // Footer Right
        doc.setFont(undefined, "normal");
        doc.text(
          now.toLocaleDateString(),
          pageWidth - 10,
          pageHeight - 10,
          { align: "right" }
        );

        // Page Number
        doc.setFont(undefined, "bold");
        doc.text(
          `Page ${dataArg.pageNumber} / ${doc.getNumberOfPages()}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: "center" }
        );
      },
    });

    /* =========================================================
       💾 SAVE
    ========================================================= */

    const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
    doc.save(`annadhanam-${stamp}.pdf`);

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
      time: normalizeTimeString(annadhanam.time),
      fromDate: normalizeDateString(annadhanam.from_date),
      toDate: normalizeDateString(annadhanam.to_date),
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
      const response = await fetch(`https://templeapi.agniplay.com/api/annadhanam/${deleteId}`, {
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

  const handleDownloadReceipt = async (annadhanamId: number, receiptNumber: string) => {
    try {
      const activeToken = token || localStorage.getItem('authToken');
      if (!activeToken) {
        toast({
          title: t("Authentication Error", "அங்கீகாரப் பிழை"),
          description: t("Please login again.", "தயவுசெய்து மீண்டும் உள்நுழையவும்."),
          variant: "destructive",
        });
        return;
      }

      // Use the proxy-friendly /api path and also append token to query string for better compatibility
      const url = `/api/annadhanam/${annadhanamId}/receipt.pdf?token=${encodeURIComponent(activeToken)}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch receipt: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `receipt-${receiptNumber || annadhanamId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to download receipt. Please try again.", "ரசீதைப் பதிவிறக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const d = date.getDate().toString().padStart(2, '0');
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  return (
    <div className={pageContainerStyles.container}>
      <div className={cn(pageContainerStyles.content, "max-w-6xl")}>
        <Card className="shadow-xl border-0 overflow-hidden">
          <CardHeader className={theme.header.container}>
            <div className={theme.header.contentSpacing}>
              <CardTitle className={theme.header.main}>
                {t("Annadhanam List", "அன்னதானம் பதிவு")}
              </CardTitle>
            </div>
          </CardHeader>

          {/* Table Card */}
          <Card className="mb-6">
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
                      className={cn(theme.input.base, theme.input.size.sm, "pl-8")}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={handleSearch}
                    />
                  </div>
                  <div className={formFieldStyles.moneyDonationList.filters.buttonContainer}>
                    <Button size="sm" className="h-8 text-xs" variant="outline" onClick={() => setSearchTerm('')}>
                      {t('Clear', 'அழி')}
                    </Button>
                    <Button size="sm" className="h-8 text-xs" variant="outline" onClick={exportToCSV} disabled={loading || data.length === 0}>
                      <FileDown className="h-3 w-3 mr-1" />
                      {t('Export CSV', 'CSV ஏற்றுமதி')}
                    </Button>
                    <Button size="sm" className="h-8 text-xs" variant="outline" onClick={exportToPDF} disabled={loading || data.length === 0}>
                      <FileDown className="h-3 w-3 mr-1" />
                      {t('Export PDF', 'PDF ஏற்றுமதி')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className={tableClasses.scrollContainerWrapper}>
                <div className={tableClasses.scrollContainer}>
                  {loading ? (
                    <div className={tableClasses.emptyState}>
                      <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
                    </div>
                  ) : (
                    <Table className={tableClasses.container}>
                      <TableHeader className={tableClasses.header}>
                        <TableRow className={tableClasses.row}>
                          <TableHead className={tableClasses.headerCellSno}>{t("S.No", "எண்")}</TableHead>
                          <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Receipt No", "ரசீது எண்")}</TableHead>
                          <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Name", "பெயர்")}</TableHead>
                          <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Mobile", "மொபைல்")}</TableHead>
                          <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Food Items", "உணவு பொருட்கள்")}</TableHead>
                          <TableHead className={cn(tableClasses.headerCell, "text-center")}>{t("People", "மக்கள்")}</TableHead>
                          <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Date Range", "தேதி வரம்பு")}</TableHead>
                          <TableHead className={cn(tableClasses.headerCell, "text-left")}>{t("Time", "நேரம்")}</TableHead>
                          <TableHead className={cn(tableClasses.headerCell, "text-right")}>{t("Actions", "செயல்கள்")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.length > 0 ? (
                          data.map((annadhanam, index) => (
                            <TableRow key={annadhanam.id} className={tableClasses.row}>
                              <TableCell className={tableClasses.cellSno}>
                                {pagination.pageIndex * pagination.pageSize + index + 1}
                              </TableCell>
                              <TableCell className={tableClasses.cell}>
                                {annadhanam.receipt_number}
                              </TableCell>
                              <TableCell className={tableClasses.cell}>{annadhanam.name}</TableCell>
                              <TableCell className={tableClasses.cell}>{annadhanam.mobile_number}</TableCell>
                              <TableCell className={cn(tableClasses.cell, "max-w-xs truncate")}>
                                {annadhanam.food}
                              </TableCell>
                              <TableCell className={cn(tableClasses.cell, "text-center")}>
                                <div className="flex items-center justify-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {annadhanam.peoples}
                                </div>
                              </TableCell>
                              <TableCell className={tableClasses.cell}>
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <div className="text-xs">
                                    <div>{formatDate(annadhanam.from_date)}</div>
                                    {annadhanam.from_date !== annadhanam.to_date && (
                                      <div className="text-muted-foreground">
                                        {t("to", "வரை")} {formatDate(annadhanam.to_date)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className={tableClasses.cell}>
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(annadhanam.time)}
                                </div>
                              </TableCell>
                              <TableCell className={cn(tableClasses.cell, tableClasses.actionCell)}>
                                <div className="flex items-center justify-end gap-1">
                                

                                  <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handleEditClick(annadhanam)}
                                     className={cn(tableClasses.actionButtonSecondary, "h-5 w-5 p-0")}
                                   >
                                     <Edit className="h-3 w-3" />
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                      onClick={() => handleDownloadReceipt(annadhanam.id, annadhanam.receipt_number)}
                                     className="h-5 w-5 p-0 text-green-600 hover:text-green-700"
                                     title={t("Download Receipt PDF", "ரசீது PDF ஐ பதிவிறக்கு")}
                                   >
                                     <FileDown className="h-3 w-3" />
                                   </Button>
                                   <Button
                                     variant="ghost"
                                     size="sm"
                                     onClick={() => handleDeleteClick(annadhanam.id)}
                                    disabled={!isLastReceipt(annadhanam)}
                                    title={!isLastReceipt(annadhanam) ? t("Only the last receipt can be deleted", "கடைசி ரசீதை மட்டுமே நீக்க முடியும்") : ""}
                                    className={cn(!isLastReceipt(annadhanam) ? "opacity-50 cursor-not-allowed h-5 w-5 p-0" : tableClasses.actionButtonDanger, "h-5 w-5 p-0")}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={9} className={tableClasses.emptyState}>
                              {t("No annadhanam entries found", "அன்னதானம் பதிவுகள் எதுவும் கிடைக்கவில்லை")}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Pagination */}
                <div className={tableClasses.pagination}>
                  <div className="text-sm text-gray-700">
                    {t("Showing", "காட்டப்படுகிறது")} {data.length} {t("of", "இல்")}{" "}
                    <span className="font-medium">{pagination.total}</span> {t("items", "உருப்படிகள்")}
                  </div>
                  <div className="flex gap-2">
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
                      className={tableClasses.paginationButton}
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
                      className={tableClasses.paginationButton}
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
                <div className="bg-gradient-to-r from-blue-300 to-indigo-400 text-white py-2 px-6 rounded-t-lg flex-shrink-0">
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
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${lg.action === 'create' ? 'bg-green-100 text-green-800' :
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
                                                  <div className="text-gray-600">{amount}</div>
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
                <div className="bg-gradient-to-r from-blue-300 to-indigo-400 text-white py-2 px-6 rounded-t-lg">
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
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${lg.action === 'create' ? 'bg-green-100 text-green-800' :
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
                                              <div className="text-gray-600">{amount}</div>
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
    </div>
  );
}
