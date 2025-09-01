'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './ActivityLogsColumns';

export default function ActivityLogsPage() {
  const { language } = useLanguage();
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/activity-logs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error('Failed to fetch activity logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [token]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {language === 'tamil' ? 'செயல்பாடு பதிவுகள்' : 'Activity Logs'}
      </h1>
      
      <DataTable 
        columns={columns} 
        data={logs} 
        loading={loading}
      />
    </div>
  );
}
