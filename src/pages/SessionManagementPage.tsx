'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DataTable } from '@/components/ui/data-table';
import { columns } from './SessionManagementColumns';
import SessionDurationChart from '@/components/SessionDurationChart';

export default function SessionManagementPage() {
  const { language } = useLanguage();
  const { token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/api/admin/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Failed to fetch sessions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [token]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {language === 'tamil' ? 'அமர்வு மேலாண்மை' : 'Session Management'}
      </h1>
      
      <DataTable 
        columns={columns} 
        data={sessions} 
        loading={loading}
      />
      <div className="mt-8">
        <SessionDurationChart data={[
          { date: 'Today', avgDuration: 45 },
          { date: 'Yesterday', avgDuration: 32 },
          { date: '2 days ago', avgDuration: 28 },
          { date: '3 days ago', avgDuration: 37 }
        ]} />
      </div>
    </div>
  );
}
