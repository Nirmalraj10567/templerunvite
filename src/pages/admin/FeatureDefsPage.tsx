import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetchFeatureDefinitions, adminCreateFeatureDefinition, adminUpdateFeatureDefinition, adminDeleteFeatureDefinition } from '@/services/subscriptionService';

interface FeatureDef {
  id: number;
  feature_key: string;
  feature_type: string;
  feature_label: string;
  description: string;
  category: string;
  options: string[] | null;
  default_value: string | null;
  sort_order: number;
  is_active: number;
}

export default function FeatureDefsPage() {
  const [features, setFeatures] = useState<FeatureDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FeatureDef | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    feature_key: '',
    feature_type: 'boolean',
    feature_label: '',
    description: '',
    category: 'modules',
    options: '',
    default_value: '',
    sort_order: 0,
  });
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    adminFetchFeatureDefinitions()
      .then(d => setFeatures(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && !isSuperAdmin) navigate('/dashboard');
  }, [loading, isSuperAdmin, navigate]);

  const resetForm = () => {
    setForm({ feature_key: '', feature_type: 'boolean', feature_label: '', description: '', category: 'modules', options: '', default_value: '', sort_order: 0 });
    setShowNew(false);
    setEditing(null);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        sort_order: Number(form.sort_order),
        options: form.options ? form.options.split(',').map(s => s.trim()) : null,
      };
      if (editing) {
        await adminUpdateFeatureDefinition(editing.id, data);
      } else {
        await adminCreateFeatureDefinition(data);
      }
      resetForm();
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    }
  };

  const handleEdit = (f: FeatureDef) => {
    setEditing(f);
    setForm({
      feature_key: f.feature_key,
      feature_type: f.feature_type,
      feature_label: f.feature_label,
      description: f.description || '',
      category: f.category,
      options: Array.isArray(f.options) ? f.options.join(', ') : '',
      default_value: f.default_value || '',
      sort_order: f.sort_order,
    });
    setShowNew(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this feature definition?')) return;
    try {
      await adminDeleteFeatureDefinition(id);
      load();
    } catch { }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!isSuperAdmin) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Feature Definitions</h1>
          <p className="text-sm text-slate-500 mt-1">Define what features plans can have</p>
        </div>
        <Button onClick={() => { resetForm(); setShowNew(true); }} disabled={showNew}>
          <Plus className="w-4 h-4 mr-2" />New Feature
        </Button>
      </div>

      {showNew && (
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-3">{editing ? 'Edit Feature' : 'New Feature'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Feature Key</Label>
              <Input value={form.feature_key} onChange={e => setForm(p => ({ ...p, feature_key: e.target.value }))} placeholder="module_accounting" />
            </div>
            <div>
              <Label>Type</Label>
              <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.feature_type} onChange={e => setForm(p => ({ ...p, feature_type: e.target.value }))}>
                <option value="boolean">Boolean (On/Off)</option>
                <option value="number">Number</option>
                <option value="select">Select</option>
                <option value="text">Text</option>
              </select>
            </div>
            <div>
              <Label>Label</Label>
              <Input value={form.feature_label} onChange={e => setForm(p => ({ ...p, feature_label: e.target.value }))} placeholder="Module: Accounting" />
            </div>
            <div>
              <Label>Category</Label>
              <select className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="limits">Limits</option>
                <option value="modules">Modules</option>
                <option value="addons">Add-ons</option>
                <option value="support">Support</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            {form.feature_type === 'select' && (
              <div>
                <Label>Options (comma-separated)</Label>
                <Input value={form.options} onChange={e => setForm(p => ({ ...p, options: e.target.value }))} placeholder="None, Email, Phone" />
              </div>
            )}
            <div>
              <Label>Default Value</Label>
              <Input value={form.default_value} onChange={e => setForm(p => ({ ...p, default_value: e.target.value }))} />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleSave}><Check className="w-4 h-4 mr-1" /> Save</Button>
            <Button size="sm" variant="outline" onClick={resetForm}><X className="w-4 h-4 mr-1" /> Cancel</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {features.map(f => (
          <Card key={f.id} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={f.is_active ? 'default' : 'secondary'} className="w-16 justify-center">{f.feature_type}</Badge>
              <div>
                <span className="font-medium text-slate-800">{f.feature_label}</span>
                <span className="text-xs text-slate-400 ml-2">({f.feature_key})</span>
                <Badge variant="outline" className="ml-2 text-xs">{f.category}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(f)}><Pencil className="w-3.5 h-3.5" /></Button>
              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
