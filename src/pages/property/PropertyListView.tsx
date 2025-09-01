import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, PlusCircle, Loader2, Eye, Edit, Trash2 } from "lucide-react";
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

  // Fetch properties from API
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
        totalPages: Math.ceil(properties.length / prev.pageSize),
      }));
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: "Error",
        description: "Failed to fetch properties. Please try again.",
        variant: "destructive",
      });
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        title: "Success",
        description: "Property updated successfully",
      });

      setIsViewEditOpen(false);
      setViewEditProperty(null);
      setEditedProperty({});
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Error",
        description: "Failed to update property. Please try again.",
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
        title: "Success",
        description: "Property deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Error",
        description: "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Property List</h1>
            <p className="text-sm text-muted-foreground">
              Manage property registrations
            </p>
          </div>
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
                  placeholder="Search by name or details..."
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
                      <TableHead>Name</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.length > 0 ? (
                      data.map((property) => (
                        <TableRow key={property.id}>
                          <TableCell className="font-medium">
                            {property.name}
                          </TableCell>
                          <TableCell>{property.details}</TableCell>
                          <TableCell className="text-right">
                            {property.value}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewClick(property)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(property)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(property.id)}
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
                        <TableCell colSpan={4} className="h-24 text-center">
                          No properties found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {data.length} of{" "}
                  <span className="font-medium">{pagination.total}</span> items
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
                    Previous
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
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View/Edit Modal */}
        <Dialog open={isViewEditOpen} onOpenChange={setIsViewEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editMode ? "Edit Property" : "View Property"}
              </DialogTitle>
              <DialogDescription>
                {editMode
                  ? "Edit the property details below"
                  : "View the property details below"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
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
                  Details
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
                  Value
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
                Cancel
              </Button>
              {editMode && (
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the property
                and remove all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
