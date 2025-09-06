'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';

export type ActivityLog = {
  id: number;
  action: string;
  actor_user_id: number;
  target_table?: string;
  target_id?: number;
  details?: string;
  created_at: string;
};

export const columns: ColumnDef<ActivityLog>[] = [
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => {
      const action = row.getValue('action');
      return (
        <span className="capitalize">
          {String(action).replace('_', ' ')}
        </span>
      );
    },
  },
  {
    accessorKey: 'target_table',
    header: 'Target',
  },
  {
    accessorKey: 'details',
    header: 'Details',
    cell: ({ row }) => {
      const details = row.getValue('details');
      return details ? (
        <div className="max-w-xs truncate">
          {JSON.stringify(details)}
        </div>
      ) : null;
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Time',
    cell: ({ row }) => format(new Date(row.getValue('created_at')), 'PPpp'),
  },
];
