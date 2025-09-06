// Simple API wrapper for hall approval/admin endpoints
export async function listHallRequests(params: { status?: string; mobile?: string; date?: string; time?: string }, token: string) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.mobile) query.set('mobile', params.mobile);
  if (params.date) query.set('date', params.date);
  if (params.time) query.set('time', params.time);

  const res = await fetch(`/api/hall-approval/requests?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to load requests: ${res.status}`);
  return res.json();
}

export async function getHallRequest(id: number, token: string) {
  const res = await fetch(`/api/hall-approval/request/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to load request: ${res.status}`);
  return res.json();
}

export async function approveHallRequest(id: number, notes: string | undefined, token: string) {
  const res = await fetch(`/api/hall-approval/approve/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ notes })
  });
  if (!res.ok) throw new Error(`Failed to approve: ${res.status}`);
  return res.json();
}

export async function rejectHallRequest(id: number, reason: string | undefined, notes: string | undefined, token: string) {
  const res = await fetch(`/api/hall-approval/reject/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason, notes })
  });
  if (!res.ok) throw new Error(`Failed to reject: ${res.status}`);
  return res.json();
}
