import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Eye, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Property } from "@/types/property";

export const columns: ColumnDef<Property>[] = [
  {
    accessorKey: "property_no",
    header: "Property No",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("property_no")}</div>
    ),
  },
  {
    accessorKey: "survey_no",
    header: "Survey No",
  },
  {
    accessorKey: "ward_no",
    header: "Ward No",
  },
  {
    accessorKey: "owner_name",
    header: "Owner Name",
  },
  {
    accessorKey: "owner_mobile",
    header: "Mobile",
  },
  {
    accessorKey: "tax_status",
    header: "Tax Status",
    cell: ({ row }) => {
      const status = row.getValue("tax_status") as string;
      const variant = {
        paid: "success",
        pending: "warning",
        partial: "secondary",
        exempted: "outline",
      }[status] as "success" | "warning" | "secondary" | "outline";

      return (
        <Badge variant={variant} className="capitalize">
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "tax_amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-0"
        >
          Tax Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("tax_amount"));
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount);

      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const property = row.original;
      const meta = table.options.meta as {
        onEdit?: (id: string) => void;
        onView?: (id: string) => void;
        onDelete?: (id: string) => void;
        canEdit?: boolean;
        canDelete?: boolean;
      };

      return (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => meta.onView?.(property.id?.toString() || '')}
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {meta.canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => meta.onEdit?.(property.id?.toString() || '')}
              title="Edit property"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {meta.canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive/90"
              onClick={() => meta.onDelete?.(property.id?.toString() || '')}
              title="Delete property"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    },
  },
];
