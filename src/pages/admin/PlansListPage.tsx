import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetchPlans, adminDeletePlan } from '@/services/subscriptionService';

interface Plan {
  id: number;
  name: string;
  slug: string;
  monthly_price: number;
  annual_price: number;
  badge: string | null;
  is_active: number;
  is_free: number;
  sort_order: number;
  features: Record<string, unknown>;
}

export default function PlansListPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    adminFetchPlans()
      .then(d => setPlans(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [loading, isSuperAdmin, navigate]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete plan "${name}"? This affects all subscribers on this plan.`)) return;
    try {
      await adminDeletePlan(id);
      load();
    } catch { }
  };

  const formatPrice = (price: number) => price === 0 ? 'Free' : `₹${(price / 100).toLocaleString('en-IN')}`;

  if (loading) {
    return <div className="p-6 text-slate-500">Loading plans...</div>;
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Plan Management</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage subscription plans</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/feature-definitions')}>Manage Features</Button>
          <Button onClick={() => navigate('/admin/plans/new')}><Plus className="w-4 h-4 mr-2" />New Plan</Button>
        </div>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  {plan.badge && <Badge className="bg-orange-100 text-orange-800">{plan.badge}</Badge>}
                  <Badge variant={plan.is_active ? 'default' : 'secondary'}>{plan.is_active ? 'Active' : 'Inactive'}</Badge>
                  {plan.is_free ? <Badge variant="outline" className="text-green-600">Free</Badge> : null}
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                  <span>Slug: {plan.slug}</span>
                  <span>Monthly: {formatPrice(plan.monthly_price)}</span>
                  <span>Annual: {formatPrice(plan.annual_price)}</span>
                  <span>Order: {plan.sort_order}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/plans/${plan.id}/edit`)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                {plans.length > 1 && (
                  <>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      if (plan.sort_order > 0) {
                        await adminFetchPlans(); // in real impl would reorder
                        load();
                      }
                    }}>
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(plan.id, plan.name)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {plans.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            No plans yet. Click "New Plan" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
