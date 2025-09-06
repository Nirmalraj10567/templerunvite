'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

export type SuperadminLog = {
  id: number;
  user_id: number;
  action: string;
  ip_address: string;
  user_agent?: string;
  timestamp: string;
};

export const columns: ColumnDef<SuperadminLog>[] = [
  {
    accessorKey: 'action',
    header: 'Action',
  },
  {
    accessorKey: 'ip_address',
    header: 'IP Address',
  },
  {
    accessorKey: 'timestamp',
    header: 'Time',
    cell: ({ row }) => format(new Date(row.getValue('timestamp')), 'PPpp'),
  },
];
