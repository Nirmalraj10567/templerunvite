import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useFeature } from '@/hooks/useFeature';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RequireFeatureProps {
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function RequireFeature({ featureKey, children, fallback }: RequireFeatureProps) {
  const hasFeature = useFeature(featureKey);

  if (hasFeature) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <ShieldAlert className="w-16 h-16 text-amber-500 mb-4" />
      <h2 className="text-xl font-semibold text-slate-800 mb-2">Feature Not Available</h2>
      <p className="text-slate-500 mb-6 max-w-md">
        This feature is not included in your current plan. Upgrade to unlock it.
      </p>
      <Link to="/dashboard/subscription/change-plan">
        <Button>View Plans & Upgrade</Button>
      </Link>
    </div>
  );
}
