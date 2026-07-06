import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2 } from 'lucide-react';
import { fetchPlans, fetchSubscription, selectPlan, createRazorpayOrder, verifyRazorpayPayment, loadRazorpayScript } from '@/services/subscriptionService';
import { useAuth } from '@/contexts/AuthContext';

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  badge: string | null;
  monthly_price: number;
  annual_price: number;
  features: Record<string, unknown>;
  is_free: boolean;
}

interface Subscription {
  plan_id: number;
  billing_cycle: string;
  status: string;
  current_period_end: string;
  plan?: { id: number; name: string; features: Record<string, unknown> };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function ChangePlanPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [annual, setAnnual] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { refreshSubscription } = useAuth();

  useEffect(() => {
    Promise.all([fetchPlans(), fetchSubscription()])
      .then(([plansData, subData]) => {
        setPlans(plansData);
        setCurrentSub(subData.data?.subscription || null);
        if (subData.data?.subscription?.billing_cycle === 'annual') {
          setAnnual(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `₹${(price / 100).toLocaleString('en-IN')}`;
  };

  const handleSelect = async (plan: Plan) => {
    setSubmitting(plan.id);
    setMessage('');

    // Free plans go through existing flow
    if (plan.is_free) {
      try {
        const result = await selectPlan(plan.id, annual ? 'annual' : 'monthly');
        setMessage(result.message || 'Plan selected successfully');
        await refreshSubscription();
        setTimeout(() => navigate('/dashboard/subscription'), 2000);
      } catch (err: any) {
        setMessage(err.message || 'Failed to select plan');
      } finally {
        setSubmitting(null);
      }
      return;
    }

    // Paid plans go through Razorpay
    try {
      const billingCycle = annual ? 'annual' : 'monthly';
      const orderData = await createRazorpayOrder(plan.id, billingCycle);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setMessage('Failed to load payment gateway. Please try again.');
        setSubmitting(null);
        return;
      }

      const options = {
        key: orderData.data.key,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'Temple Run',
        description: `${plan.name} Plan - ${billingCycle}`,
        order_id: orderData.data.order_id,
        handler: async (response: any) => {
          try {
            await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_id: plan.id,
              billing_cycle: billingCycle,
            });
            setMessage('Payment successful! Plan activated.');
            await refreshSubscription();
            setTimeout(() => navigate('/dashboard/subscription'), 2000);
          } catch (err: any) {
            setMessage(err.message || 'Payment verification failed. Contact support.');
          } finally {
            setSubmitting(null);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#ea580c',
        },
        modal: {
          ondismiss: () => {
            setMessage('Payment cancelled.');
            setSubmitting(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setMessage(response.error?.description || 'Payment failed. Please try again.');
        setSubmitting(null);
      });
      rzp.open();
    } catch (err: any) {
      setMessage(err.message || 'Failed to initiate payment');
      setSubmitting(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-500">Loading plans...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Change Plan</h1>
        <p className="text-slate-500">Choose a plan that fits your temple's needs. Switch anytime.</p>
        <div className="flex items-center gap-3 mt-4">
          <span className={`text-sm font-medium ${!annual ? 'text-slate-900' : 'text-slate-500'}`}>Monthly</span>
          <button
            onClick={() => setAnnual(!annual)}
            className={`relative w-14 h-7 rounded-full transition-colors ${annual ? 'bg-orange-600' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${annual ? 'translate-x-7' : ''}`} />
          </button>
          <span className={`text-sm font-medium ${annual ? 'text-slate-900' : 'text-slate-500'}`}>
            Annual <span className="text-orange-600 font-semibold">Save 15%</span>
          </span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 ${message.includes('error') || message.includes('Failed') || message.includes('cancelled') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = annual ? plan.annual_price : plan.monthly_price;
          const period = annual ? '/year' : '/month';
          const features = plan.features || {};
          const isCurrentPlan = currentSub?.plan_id === plan.id;

          return (
            <Card key={plan.id} className={`relative flex flex-col p-6 ${isCurrentPlan ? 'ring-2 ring-green-500 shadow-lg bg-green-50/30' : plan.badge ? 'ring-2 ring-orange-500 shadow-lg' : 'border border-slate-200'}`}>
              {isCurrentPlan && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-1">
                  Current Plan
                </Badge>
              )}
              {!isCurrentPlan && plan.badge && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-4 py-1">
                  {plan.badge}
                </Badge>
              )}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-slate-900">{formatPrice(price)}</span>
                {!plan.is_free && <span className="text-slate-500 ml-1">{period}</span>}
              </div>
              {isCurrentPlan ? (
                <Button disabled className="w-full mb-4 bg-green-600 hover:bg-green-600">
                  Current Plan
                </Button>
              ) : (
                <Button
                  onClick={() => handleSelect(plan)}
                  disabled={submitting === plan.id}
                  className={`w-full mb-4 ${plan.badge ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                  variant={plan.badge ? 'default' : 'outline'}
                >
                  {submitting === plan.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {plan.is_free ? 'Select Free Plan' : `Pay ${formatPrice(price)}${period}`}
                </Button>
              )}
              <div className="space-y-2 flex-1 text-sm">
                {Object.entries(features).map(([key, value]) => {
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const enabled = typeof value === 'boolean' ? value : (typeof value === 'number' ? value !== 0 : value !== 'None' && value !== null);

                  if (key.startsWith('max_') && typeof value === 'number') {
                    const limit = value === -1 ? 'Unlimited' : value.toLocaleString();
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="text-slate-700">{label}: <strong>{limit}</strong></span>
                      </div>
                    );
                  }

                  return (
                    <div key={key} className="flex items-center gap-2">
                      {enabled ? <Check className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-red-300 shrink-0" />}
                      <span className={enabled ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
