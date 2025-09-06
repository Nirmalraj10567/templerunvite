import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PermissionDeniedProps {
  requiredRole?: string;
  requiredPermission?: string;
}

export default function PermissionDenied({ requiredRole, requiredPermission }: PermissionDeniedProps) {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-4">Permission Denied</h1>
        <p className="mb-4">
          You don't have permission to access this page.
          {requiredRole && ` Requires role: ${requiredRole}`}
          {requiredPermission && ` Requires permission: ${requiredPermission}`}
        </p>
        <Button onClick={() => navigate(-1)} className="mr-2">
          Go Back
        </Button>
        <Button onClick={() => navigate('/')} variant="outline">
          Go Home
        </Button>
      </div>
    </div>
  );
}
