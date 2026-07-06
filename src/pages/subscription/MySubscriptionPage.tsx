import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchSubscription, cancelSubscription, fetchPayments } from '@/services/subscriptionService';
import { CheckCircle, XCircle, AlertTriangle, CreditCard, Calendar } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function MySubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const { isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchSubscription(),
      fetchPayments(),
    ])
      .then(([subData, payData]) => {
        setData(subData.data);
        setPayments(payData.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleConfirmCancel = async () => {
    setShowCancelDialog(false);
    setCancelling(true);
    try {
      await cancelSubscription();
      load();
    } catch { } finally { setCancelling(false); }
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Loading subscription details...</div>;
  }

  const { subscription, usage, plans } = data || {};
  const plan = subscription?.plan;

  const formatPrice = (price: number) => price === 0 ? 'Free' : `₹${(price / 100).toLocaleString('en-IN')}`;

  const getFeatureLimit = (key: string): number | string => {
    if (!plan?.features) return 'N/A';
    const val = plan.features[key];
    if (val === -1) return 'Unlimited';
    if (typeof val === 'number') return val.toLocaleString();
    return 'N/A';
  };

  const getUsage = (key: string): number => usage?.[key] || 0;
  const getLimit = (key: string): number => {
    const val = plan?.features?.[key];
    if (val === -1) return Infinity;
    if (typeof val === 'number') return val;
    return 0;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Subscription</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/pricing')}>View Plans</Button>
          <Button onClick={() => navigate('/dashboard/subscription/change-plan')}>Change Plan</Button>
        </div>
      </div>

      {subscription ? (
        <>
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Current Plan</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {subscription.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing
                </p>
              </div>
              <div className="text-right">
                <Badge className={`text-sm px-3 py-1 ${
                  subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                  subscription.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  subscription.status === 'expired' ? 'bg-red-100 text-red-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </Badge>
              </div>
            </div>

            {plan && (
              <div className="mb-4">
                <span className="text-3xl font-bold text-slate-900">{plan.name}</span>
                <span className="text-lg text-slate-500 ml-2">
                  {formatPrice(plan.monthly_price)}/mo
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1"><Calendar className="w-4 h-4" /> Period</div>
                <div className="font-medium text-slate-800">
                  {subscription.current_period_start ? new Date(subscription.current_period_start).toLocaleDateString() : 'N/A'}
                  {' → '}
                  {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              {subscription.trial_ends_at && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-amber-600 mb-1"><AlertTriangle className="w-4 h-4" /> Trial Ends</div>
                  <div className="font-medium text-amber-800">{new Date(subscription.trial_ends_at).toLocaleDateString()}</div>
                </div>
              )}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1"><CreditCard className="w-4 h-4" /> Next Payment</div>
                <div className="font-medium text-slate-800">
                  {subscription.status === 'active' ? formatPrice(plan?.monthly_price || 0) : '—'}
                </div>
              </div>
            </div>

            {subscription.status !== 'cancelled' && subscription.status !== 'expired' && (
              <Button variant="destructive" onClick={() => setShowCancelDialog(true)} disabled={cancelling} className="mt-2">
                {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </Button>
            )}
          </Card>

          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Usage</h2>
            <div className="space-y-4">
              {[
                { key: 'max_members', label: 'Members' },
                { key: 'max_monthly_transactions', label: 'Monthly Transactions' },
                { key: 'max_admin_users', label: 'Admin Users' },
              ].map(({ key, label }) => {
                const used = getUsage(key);
                const limit = getLimit(key);
                const pct = limit === Infinity ? 0 : limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                const isOver = limit !== Infinity && used > limit;

                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">{label}</span>
                      <span className={`font-medium ${isOver ? 'text-red-600' : 'text-slate-800'}`}>
                        {used.toLocaleString()} / {limit === Infinity ? 'Unlimited' : limit.toLocaleString()}
                      </span>
                    </div>
                    {limit !== Infinity && limit > 0 && (
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Plan Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan?.features && Object.entries(plan.features).map(([key, value]) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const enabled = typeof value === 'boolean' ? value : (typeof value === 'number' && value !== 0) || (typeof value === 'string' && value !== 'None' && value !== null);

                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    {enabled ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                    <span className={enabled ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                    {typeof value === 'number' && value > 0 && <Badge variant="outline" className="ml-auto">{value === -1 ? '∞' : value.toLocaleString()}</Badge>}
                    {key === 'priority_support' && typeof value === 'string' && <Badge variant="outline" className="ml-auto">{value}</Badge>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment History</h2>
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Date</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Amount</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Billing</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Status</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Payment ID</th>
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-700">{new Date(p.paid_at || p.created_at).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-slate-700 font-medium">₹{(p.amount / 100).toLocaleString('en-IN')}</td>
                        <td className="py-2 px-3 text-slate-700 capitalize">{p.billing_cycle}</td>
                        <td className="py-2 px-3">
                          <Badge className={p.status === 'paid' ? 'bg-green-100 text-green-800' : p.status === 'refunded' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}>
                            {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-xs">{p.razorpay_payment_id || '—'}</td>
                        <td className="py-2 px-3 text-slate-500">{p.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No payments recorded yet.</p>
            )}
          </Card>
        </>
      ) : (
        <Card className="p-12 text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">No Active Subscription</h2>
          <p className="text-slate-500 mb-6">Choose a plan to get started with all features.</p>
          <Button onClick={() => navigate('/dashboard/subscription/change-plan')}>Choose a Plan</Button>
        </Card>
      )}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your subscription? You will lose access at the end of the current period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-red-600 hover:bg-red-700 text-white">
              Confirm Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
