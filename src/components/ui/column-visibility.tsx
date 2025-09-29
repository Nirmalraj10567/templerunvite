import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface ColumnVisibilityProps {
  columns: Array<{ key: string; label: string }>;
  visibleColumns: Record<string, boolean>;
  onToggleColumn: (key: string) => void;
}

export function ColumnVisibilityMenu({
  columns,
  visibleColumns,
  onToggleColumn,
}: ColumnVisibilityProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <span>Columns</span>
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.key}
            checked={!!visibleColumns[column.key]}
            onCheckedChange={() => onToggleColumn(column.key)}
            className="capitalize"
          >
            {column.label}
            {visibleColumns[column.key] && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
