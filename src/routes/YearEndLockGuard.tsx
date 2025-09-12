import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  children: React.ReactNode;
}

export default function YearEndLockGuard({ children }: Props) {
  const { token, isSuperAdmin } = useAuth();
  const [locked, setLocked] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    if (isSuperAdmin) {
      setLocked(false);
      return;
    }
    fetch('/api/system/year-end-status', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (mounted) setLocked(!!d?.data?.locked); })
      .catch(() => { if (mounted) setLocked(false); });
    return () => { mounted = false; };
  }, [token, isSuperAdmin]);

  if (isSuperAdmin) return <>{children}</>;
  if (locked === null) return <div className="p-6 text-slate-600">Checking year-end status…</div>;
  if (locked) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-800">Year-End Lock Active</h2>
          <p className="text-amber-900 mt-2">Editing is temporarily disabled during year-end closing. Please contact your superadmin if you need changes.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
