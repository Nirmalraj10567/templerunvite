import { useAuth } from '@/contexts/AuthContext';

export function useFeature(featureKey: string): boolean {
  const { planFeatures, isSuperAdmin } = useAuth();
  if (isSuperAdmin) return true;
  const val = planFeatures?.[featureKey];
  if (val === undefined) return true;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val === -1 || val > 0;
  return !!val;
}

export function useFeatureLimit(featureKey: string): number {
  const { planFeatures } = useAuth();
  const val = planFeatures?.[featureKey];
  if (typeof val === 'number') return val;
  return -1;
}
