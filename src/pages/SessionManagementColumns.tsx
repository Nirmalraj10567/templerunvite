'use client';

import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export type Session = {
  id: string;
  user_id: number;
  full_name: string;
  mobile: string;
  ip_address: string;
  user_agent?: string;
  login_at: string;
  last_activity: string;
  logout_at?: string;
  status: 'active' | 'expired' | 'terminated';
};

export const columns: ColumnDef<Session>[] = [
  {
    accessorKey: 'full_name',
    header: 'User',
  },
  {
    accessorKey: 'mobile',
    header: 'Mobile',
  },
  {
    accessorKey: 'ip_address',
    header: 'IP Address',
  },
  {
    accessorKey: 'login_at',
    header: 'Login Time',
    cell: ({ row }) => format(new Date(row.getValue('login_at')), 'PPpp'),
  },
  {
    accessorKey: 'last_activity',
    header: 'Last Activity',
    cell: ({ row }) => format(new Date(row.getValue('last_activity')), 'PPpp'),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status');
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${
          status === 'active' ? 'bg-green-100 text-green-800' :
          status === 'expired' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
        </span>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const session = row.original;
      const [isTerminating, setIsTerminating] = useState(false);
      
      const handleTerminate = async () => {
        try {
          setIsTerminating(true);
          const response = await fetch(`/api/sessions/${session.id}/terminate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          
          if (response.ok) {
            // Update local state to reflect termination
            row.toggleSelected(false);
          }
        } catch (err) {
          console.error('Failed to terminate session:', err);
        } finally {
          setIsTerminating(false);
        }
      };
      
      return (
        <Button 
          variant="destructive" 
          size="sm"
          disabled={session.status !== 'active' || isTerminating}
          onClick={handleTerminate}
        >
          {isTerminating ? 'Terminating...' : 'Terminate'}
        </Button>
      );
    },
  },
];
