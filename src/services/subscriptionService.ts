const API_BASE = (import.meta.env.VITE_API_BASE_URL as string || '').replace(/\/+$/, '') || '';
const API_URL = API_BASE.endsWith('/api') ? API_BASE : `${API_BASE}/api`;

async function authFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export async function fetchPlans() {
  const res = await fetch(`${API_URL}/plans`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch plans');
  return data.data;
}

export async function fetchSubscription() {
  return authFetch(`${API_URL}/subscription`);
}

export async function selectPlan(planId: number, billingCycle: 'monthly' | 'annual') {
  return authFetch(`${API_URL}/subscription/select`, {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
  });
}

export async function fetchPayments() {
  return authFetch(`${API_URL}/subscription/payments`);
}

export async function cancelSubscription() {
  return authFetch(`${API_URL}/subscription/cancel`, { method: 'POST' });
}

export async function createRazorpayOrder(planId: number, billingCycle: 'monthly' | 'annual') {
  return authFetch(`${API_URL}/payment/create-order`, {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId, billing_cycle: billingCycle }),
  });
}

export async function verifyRazorpayPayment(data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan_id: number;
  billing_cycle: string;
}) {
  return authFetch(`${API_URL}/payment/verify`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function adminFetchPlans() {
  return authFetch(`${API_URL}/admin/plans`);
}

export async function adminCreatePlan(data: Record<string, unknown>) {
  return authFetch(`${API_URL}/admin/plans`, { method: 'POST', body: JSON.stringify(data) });
}

export async function adminUpdatePlan(id: number, data: Record<string, unknown>) {
  return authFetch(`${API_URL}/admin/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function adminDeletePlan(id: number) {
  return authFetch(`${API_URL}/admin/plans/${id}`, { method: 'DELETE' });
}

export async function adminFetchFeatureDefinitions() {
  return authFetch(`${API_URL}/admin/feature-definitions`);
}

export async function adminCreateFeatureDefinition(data: Record<string, unknown>) {
  return authFetch(`${API_URL}/admin/feature-definitions`, { method: 'POST', body: JSON.stringify(data) });
}

export async function adminUpdateFeatureDefinition(id: number, data: Record<string, unknown>) {
  return authFetch(`${API_URL}/admin/feature-definitions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function adminDeleteFeatureDefinition(id: number) {
  return authFetch(`${API_URL}/admin/feature-definitions/${id}`, { method: 'DELETE' });
}

export async function adminFetchSubscriptions() {
  return authFetch(`${API_URL}/admin/subscriptions`);
}

export async function adminFetchPendingRequests() {
  return authFetch(`${API_URL}/admin/pending-requests`);
}

export async function adminApprovePlanChange(data: Record<string, unknown>) {
  return authFetch(`${API_URL}/admin/approve-plan-change`, { method: 'POST', body: JSON.stringify(data) });
}

export async function adminRecordPayment(data: Record<string, unknown>) {
  return authFetch(`${API_URL}/admin/record-payment`, { method: 'POST', body: JSON.stringify(data) });
}

export async function adminForceUpdateSubscription(data: Record<string, unknown>) {
  return authFetch(`${API_URL}/admin/subscription/force-update`, { method: 'POST', body: JSON.stringify(data) });
}
