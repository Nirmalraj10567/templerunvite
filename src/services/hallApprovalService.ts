// Simple API wrapper for hall approval/admin endpoints
export async function listHallRequests(params: { status?: string; mobile?: string; date?: string; time?: string }, token: string) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.mobile) query.set('mobile', params.mobile);
  if (params.date) query.set('date', params.date);
  if (params.time) query.set('time', params.time);

  const res = await fetch(`https://templeapi.agniplay.com/api/hall-approval/requests?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to load requests: ${res.status}`);
  return res.json();
}

export async function getHallRequest(id: number, token: string) {
  const res = await fetch(`https://templeapi.agniplay.com/api/hall-approval/request/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`Failed to load request: ${res.status}`);
  return res.json();
}

export async function approveHallRequest(id: number, notes: string | undefined, token: string) {
  const res = await fetch(`https://templeapi.agniplay.com/api/hall-approval/approve/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ notes })
  });
  if (!res.ok) throw new Error(`Failed to approve: ${res.status}`);
  return res.json();
}

export async function rejectHallRequest(id: number, reason: string | undefined, notes: string | undefined, token: string) {
  const res = await fetch(`https://templeapi.agniplay.com/api/hall-approval/reject/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason, notes })
  });
  if (!res.ok) throw new Error(`Failed to reject: ${res.status}`);
  return res.json();
}

// Update editable fields of a hall request
export async function updateHallRequest(
  id: number,
  payload: {
    date?: string;
    time?: string;
    event?: string;
    name?: string;
    address?: string;
    village?: string;
    mobile?: string;
    advanceAmount?: string;
    totalAmount?: string;
    balanceAmount?: string;
    remarks?: string;
  },
  token: string
) {
  const res = await fetch(`https://templeapi.agniplay.com/api/hall-bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let msg = `Failed to update: ${res.status}`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return res.json();
}
