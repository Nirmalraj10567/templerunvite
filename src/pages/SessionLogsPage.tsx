import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataTable } from '../components/ui/DataTable';
import { ColumnDef } from '@tanstack/react-table';

interface SessionLog {
  id: number;
  user_id: number;
  login_time: string;
  logout_time: string | null;
  ip_address: string;
  user_agent: string;
  duration_seconds: number | null;
}

const SessionLogsPage = () => {
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const { token } = useAuth();

  useEffect(() => {
    const fetchSessionLogs = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/session-logs', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch session logs');
        }
        
        const data = await response.json();
        setSessionLogs(data);
      } catch (error) {
        console.error('Error fetching session logs:', error);
      }
    };

    fetchSessionLogs();
  }, [token]);

  const columns: ColumnDef<SessionLog>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
    },
    {
      accessorKey: 'user_id',
      header: 'User ID',
    },
    {
      accessorKey: 'login_time',
      header: 'Login Time',
      cell: ({ row }) => new Date(row.original.login_time).toLocaleString(),
    },
    {
      accessorKey: 'logout_time',
      header: 'Logout Time',
      cell: ({ row }) => row.original.logout_time ? new Date(row.original.logout_time).toLocaleString() : 'Still logged in',
    },
    {
      accessorKey: 'ip_address',
      header: 'IP Address',
    },
    {
      accessorKey: 'user_agent',
      header: 'User Agent',
    },
    {
      accessorKey: 'duration_seconds',
      header: 'Duration (seconds)',
    },
  ];

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Session Logs</h1>
      <DataTable columns={columns} data={sessionLogs} />
    </div>
  );
};

export default SessionLogsPage;
