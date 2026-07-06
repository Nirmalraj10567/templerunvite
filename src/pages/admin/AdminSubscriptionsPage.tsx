import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, DollarSign, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminFetchSubscriptions, adminFetchPendingRequests, adminApprovePlanChange, adminRecordPayment, adminFetchPlans } from '@/services/subscriptionService';

interface Subscription {
  id: number;
  temple_id: number;
  temple_name: string;
  plan_id: number;
  plan_name: string;
  billing_cycle: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  monthly_price: number;
  annual_price: number;
}

interface Plan {
  id: number;
  name: string;
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [pending, setPending] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState<Record<string, string>>({});
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [subsRes, pendingRes, plansRes] = await Promise.all([
        adminFetchSubscriptions(),
        adminFetchPendingRequests(),
        adminFetchPlans(),
      ]);
      setSubscriptions(subsRes.data || []);
      setPending(pendingRes.data || []);
      setPlans(plansRes.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!loading && !isSuperAdmin) navigate('/dashboard');
  }, [loading, isSuperAdmin, navigate]);

  const handleApprove = async (sub: Subscription) => {
    setApproving(sub.id);
    try {
      await adminApprovePlanChange({ subscription_id: sub.id });
      load();
    } catch { } finally { setApproving(null); }
  };

  const handleRecordPayment = async (sub: Subscription) => {
    const amount = paymentForm[`amount_${sub.id}`];
    if (!amount) return;
    setPaymentSubmitting(true);
    try {
      await adminRecordPayment({
        temple_id: sub.temple_id,
        subscription_id: sub.id,
        amount: parseInt(amount),
        billing_cycle: sub.billing_cycle,
        notes: paymentForm[`notes_${sub.id}`] || '',
      });
      setPaymentForm(p => ({ ...p, [`amount_${sub.id}`]: '', [`notes_${sub.id}`]: '' }));
      load();
    } catch { } finally { setPaymentSubmitting(false); }
  };

  if (loading) return <div className="p-6 text-slate-500">Loading...</div>;
  if (!isSuperAdmin) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Subscription Management</h1>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Subscriptions ({subscriptions.length})</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Requests
            {pending.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white text-xs">{pending.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-3">
            {subscriptions.map(sub => (
              <Card key={sub.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900">{sub.temple_name}</h3>
                      <Badge className={
                        sub.status === 'active' ? 'bg-green-100 text-green-800' :
                        sub.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        sub.status === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                      }>{sub.status}</Badge>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      Plan: <strong>{sub.plan_name}</strong> | {sub.billing_cycle} |
                      Period: {sub.current_period_start ? new Date(sub.current_period_start).toLocaleDateString() : 'N/A'} — {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'N/A'}
                      {sub.trial_ends_at && <span className="ml-2 text-amber-600">Trial ends: {new Date(sub.trial_ends_at).toLocaleDateString()}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Amount (paise)"
                        className="w-32 h-8 text-sm"
                        value={paymentForm[`amount_${sub.id}`] || ''}
                        onChange={e => setPaymentForm(p => ({ ...p, [`amount_${sub.id}`]: e.target.value }))}
                      />
                      <Input
                        placeholder="Notes"
                        className="w-40 h-8 text-sm"
                        value={paymentForm[`notes_${sub.id}`] || ''}
                        onChange={e => setPaymentForm(p => ({ ...p, [`notes_${sub.id}`]: e.target.value }))}
                      />
                      <Button size="sm" variant="outline" onClick={() => handleRecordPayment(sub)} disabled={paymentSubmitting || !paymentForm[`amount_${sub.id}`]}>
                        <DollarSign className="w-3.5 h-3.5 mr-1" /> Record Payment
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            {subscriptions.length === 0 && <p className="text-slate-500 text-center py-8">No subscriptions found</p>}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <div className="space-y-3">
            {pending.map(sub => (
              <Card key={sub.id} className="p-4 border-amber-200 border-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{sub.temple_name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Requested plan: <strong>{sub.plan_name}</strong> ({sub.billing_cycle})
                    </p>
                    <p className="text-xs text-slate-400">Since {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleApprove(sub)} disabled={approving === sub.id}>
                      {approving === sub.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-500">
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {pending.length === 0 && (
              <p className="text-slate-500 text-center py-8">No pending requests</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
