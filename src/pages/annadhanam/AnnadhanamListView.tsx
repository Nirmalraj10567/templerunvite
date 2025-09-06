import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, PlusCircle, Loader2, Eye, Edit, Trash2, Calendar, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { useLanguage } from "@/contexts/LanguageContext";

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

export default function AnnadhanamListView() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { language } = useLanguage();

  const t = (en: string, ta: string) => language === 'tamil' ? ta : en;

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
  const [editMode, setEditMode] = useState(false);
  const [editedAnnadhanam, setEditedAnnadhanam] = useState<Partial<AnnadhanamFormData>>({});

  const isSuperAdmin = user?.role === "superadmin";

  const canEdit =
    isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "annadhanam_registrations" &&
        (p.access_level === "edit" || p.access_level === "full")
    );

  const canDelete =
    isSuperAdmin ||
    (user as any)?.permissions?.some(
      (p: any) =>
        p.permission_id === "annadhanam_registrations" &&
        p.access_level === "full"
    );

  // Fetch annadhanam entries from API
  const fetchAnnadhanam = async () => {
    try {
      setLoading(true);

      const response = await fetch(`/api/annadhanam?page=${pagination.pageIndex + 1}&pageSize=${pagination.pageSize}&q=${encodeURIComponent(searchTerm)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch annadhanam data');
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setPagination((prev) => ({
          ...prev,
          total: result.data.length,
          totalPages: Math.ceil(result.data.length / prev.pageSize),
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
    setEditMode(false);
    setIsViewEditOpen(true);
  };

  const handleEditClick = (annadhanam: Annadhanam) => {
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
    setEditMode(true);
    setIsViewEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!viewEditAnnadhanam || !editedAnnadhanam) return;

    try {
      const response = await fetch(`/api/annadhanam/${viewEditAnnadhanam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editedAnnadhanam)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update annadhanam');
      }

      const result = await response.json();

      if (result.success) {
        setData((prev) =>
          prev.map((item) =>
            item.id === viewEditAnnadhanam.id ? { ...item, ...result.data } : item
          )
        );

        toast({
          title: t("Success", "வெற்றி"),
          description: t("Annadhanam updated successfully", "அன்னதானம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது"),
        });

        setIsViewEditOpen(false);
        setViewEditAnnadhanam(null);
        setEditedAnnadhanam({});
      } else {
        throw new Error(result.error || 'Failed to update annadhanam');
      }
    } catch (error) {
      console.error("Error updating annadhanam:", error);
      toast({
        title: t("Error", "பிழை"),
        description: t("Failed to update annadhanam. Please try again.", "அன்னதானத்தை புதுப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."),
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
      const response = await fetch(`/api/annadhanam/${deleteId}`, {
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
        </div>

        {/* Table Card */}
        <Card>
          <CardContent className="pt-6">
            {/* Search */}
            <div className="mb-4">
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
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(annadhanam)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(annadhanam.id)}
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

        {/* View/Edit Modal */}
        <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? t("Edit Annadhanam", "அன்னதானத்தை திருத்து") : t("View Annadhanam", "அன்னதானத்தை பார்க்க")}
              </DialogTitle>
              <DialogDescription>
                {editMode
                  ? t("Edit the annadhanam details below", "கீழே உள்ள அன்னதான விவரங்களை திருத்தவும்")
                  : t("View the annadhanam details below", "கீழே உள்ள அன்னதான விவரங்களை பார்க்கவும்")}
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
                  disabled={!editMode}
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
                  disabled={!editMode}
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
                  disabled={!editMode}
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
                  value={editedAnnadhanam.time || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, time: e.target.value })
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
                  value={editedAnnadhanam.fromDate || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, fromDate: e.target.value })
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
                  value={editedAnnadhanam.toDate || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, toDate: e.target.value })
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
                  value={editedAnnadhanam.remarks || ""}
                  onChange={(e) =>
                    setEditedAnnadhanam({ ...editedAnnadhanam, remarks: e.target.value })
                  }
                  className="col-span-3"
                  disabled={!editMode}
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
      </div>
    </div>
  );
}
