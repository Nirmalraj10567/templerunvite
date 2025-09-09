import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MemberLogsView from './MemberLogsView';

export default function MemberLogsPage() {
  const { token } = useAuth();
  return (
    <div className="p-4">
      <MemberLogsView token={token} />
    </div>
  );
}
