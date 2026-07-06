import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { fetchPlans } from '@/services/subscriptionService';

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  badge: string | null;
  monthly_price: number;
  annual_price: number;
  features: Record<string, unknown>;
  sort_order: number;
  is_free: boolean;
}

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [annual, setAnnual] = useState(false);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans()
      .then(data => setPlans(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatPrice = (price: number) => {
    if (price === 0) return 'Free';
    return `₹${(price / 100).toLocaleString('en-IN')}`;
  };

  const handleSelect = (plan: Plan) => {
    if (!user || !token) {
      navigate('/register');
      return;
    }
    navigate('/dashboard/subscription/change-plan');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-slate-500 text-lg">Loading plans...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Choose Your Plan</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Select the perfect plan for your temple. Upgrade or downgrade anytime.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const price = annual ? plan.annual_price : plan.monthly_price;
            const period = annual ? '/year' : '/month';
            const features = plan.features || {};

            return (
              <Card key={plan.id} className={`relative flex flex-col p-6 ${plan.badge ? 'ring-2 ring-orange-500 shadow-lg scale-105' : 'border border-slate-200'}`}>
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-4 py-1 text-sm font-semibold">
                    {plan.badge}
                  </Badge>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-slate-900">{formatPrice(price)}</span>
                  {!plan.is_free && <span className="text-slate-500 ml-1">{period}</span>}
                </div>
                <Button
                  onClick={() => handleSelect(plan)}
                  className={`w-full mb-6 ${plan.badge ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                  variant={plan.badge ? 'default' : 'outline'}
                >
                  {plan.is_free ? 'Get Started Free' : 'Choose Plan'}
                </Button>
                <div className="space-y-3 flex-1">
                  {Object.entries(features).map(([key, value]) => {
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    const enabled = typeof value === 'boolean' ? value : (typeof value === 'number' ? value !== 0 : value !== 'None' && value !== null);

                    if (key.startsWith('max_') && typeof value === 'number') {
                      const limit = value === -1 ? 'Unlimited' : value.toLocaleString();
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="text-slate-700">{label}: <strong>{limit}</strong></span>
                        </div>
                      );
                    }

                    if (key === 'priority_support') {
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          {enabled ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-red-400 shrink-0" />}
                          <span className="text-slate-700">{label}: <strong>{String(value)}</strong></span>
                        </div>
                      );
                    }

                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        {enabled ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : <X className="w-4 h-4 text-red-400 shrink-0" />}
                        <span className={enabled ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        {!user && (
          <div className="text-center mt-12">
            <p className="text-slate-500 mb-4">Already have an account?</p>
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
