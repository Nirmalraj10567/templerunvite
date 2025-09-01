'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './SuperadminLogsColumns';

export default function SuperadminLogsPage() {
  const { token, isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/superadmin-logs', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setLogs(data));
    }
  }, [isSuperAdmin, token]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Superadmin Activity Logs</h1>
      <DataTable columns={columns} data={logs} />
    </div>
  );
}
