import { apiFetch } from '../../core/api.js';

const BASE = '/api/reports/print';

export async function getInventoryDetailReport(month, date) {
  const params = new URLSearchParams({ month });
  if (date) params.set('date', date);
  const res  = await apiFetch(`${BASE}/inventory/detail?${params}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood unit detail report.');
  return body.data;
}

export async function getInventoryAvailableDates(month) {
  const res  = await apiFetch(`${BASE}/inventory/dates?${new URLSearchParams({ month })}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load available dates.');
  return body.data;
}

export async function getRequestsDetailReport(month, date) {
  const params = new URLSearchParams({ month });
  if (date) params.set('date', date);
  const res  = await apiFetch(`${BASE}/requests/detail?${params}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood request detail report.');
  return body.data;
}

export async function getRequestsAvailableDates(month) {
  const res  = await apiFetch(`${BASE}/requests/dates?${new URLSearchParams({ month })}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load available dates.');
  return body.data;
}