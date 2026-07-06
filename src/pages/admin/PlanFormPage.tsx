import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetchPlans, adminCreatePlan, adminUpdatePlan, adminFetchFeatureDefinitions } from '@/services/subscriptionService';

interface FeatureDef {
  id: number;
  feature_key: string;
  feature_type: string;
  feature_label: string;
  category: string;
  options: string[] | null;
  default_value: string | null;
}

export default function PlanFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [featureDefs, setFeatureDefs] = useState<FeatureDef[]>([]);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    badge: '',
    monthly_price: 0,
    annual_price: 0,
    sort_order: 0,
    is_active: true,
    is_free: false,
    features: {} as Record<string, unknown>,
  });
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSuperAdmin) { navigate('/dashboard'); return; }
    adminFetchFeatureDefinitions()
      .then(d => { setFeatureDefs(d.data || []); })
      .catch(() => {});
    if (isEdit) {
      adminFetchPlans()
        .then(d => {
          const plan = d.data?.find((p: any) => p.id === Number(id));
          if (plan) {
            setForm({
              name: plan.name || '',
              slug: plan.slug || '',
              description: plan.description || '',
              badge: plan.badge || '',
              monthly_price: plan.monthly_price || 0,
              annual_price: plan.annual_price || 0,
              sort_order: plan.sort_order || 0,
              is_active: !!plan.is_active,
              is_free: !!plan.is_free,
              features: plan.features || {},
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id, isEdit, isSuperAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        monthly_price: Number(form.monthly_price),
        annual_price: Number(form.annual_price),
        sort_order: Number(form.sort_order),
      };
      if (isEdit) {
        await adminUpdatePlan(Number(id), payload);
      } else {
        await adminCreatePlan(payload);
      }
      navigate('/admin/plans');
    } catch (err: any) {
      alert(err.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const updateFeature = (key: string, value: unknown) => {
    setForm(prev => ({ ...prev, features: { ...prev.features, [key]: value } }));
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">{isEdit ? 'Edit Plan' : 'New Plan'}</h1>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Plan Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, name: v, slug: isEdit ? p.slug : v.toLowerCase().replace(/\s+/g, '-') })); }} required />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={e => setForm(p => ({ ...p, slug: e.target.value }))} required disabled={isEdit} />
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Badge (e.g. "Popular")</Label>
              <Input value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))} placeholder="Popular, Best Value" />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Monthly Price (in paise, 0=free)</Label>
              <Input type="number" value={form.monthly_price} onChange={e => setForm(p => ({ ...p, monthly_price: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Annual Price (in paise, 0=free)</Label>
              <Input type="number" value={form.annual_price} onChange={e => setForm(p => ({ ...p, annual_price: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_free} onCheckedChange={v => setForm(p => ({ ...p, is_free: v }))} />
                <Label>Free Plan</Label>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Feature Values</h2>
          <p className="text-sm text-slate-500 mb-4">Set values for each feature. Features are defined in Feature Definitions.</p>
          <div className="space-y-4">
            {featureDefs.map(fd => (
              <div key={fd.id} className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">{fd.feature_label}</Label>
                  <p className="text-xs text-slate-400">{fd.feature_key} ({fd.category})</p>
                </div>
                <div className="w-48">
                  {fd.feature_type === 'boolean' ? (
                    <Switch
                      checked={!!form.features[fd.feature_key]}
                      onCheckedChange={v => updateFeature(fd.feature_key, v)}
                    />
                  ) : fd.feature_type === 'number' ? (
                    <Input
                      type="number"
                      value={(form.features[fd.feature_key] as number) ?? 0}
                      onChange={e => updateFeature(fd.feature_key, parseInt(e.target.value) || 0)}
                      placeholder="-1 = unlimited"
                    />
                  ) : fd.feature_type === 'select' ? (
                    <select
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                      value={(form.features[fd.feature_key] as string) || ''}
                      onChange={e => updateFeature(fd.feature_key, e.target.value)}
                    >
                      {(fd.options as string[] || ['None']).map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={(form.features[fd.feature_key] as string) || ''}
                      onChange={e => updateFeature(fd.feature_key, e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {isEdit ? 'Update Plan' : 'Create Plan'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/plans')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
