import { apiFetch } from '../../core/api.js';

// GET /api/blood-drives
export async function getAllDrives() {
  const res = await apiFetch('/api/blood-drives');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood drives.');
  return body.data;
}

// GET /api/blood-drives/:id
export async function getDriveById(driveId) {
  const res = await apiFetch(`/api/blood-drives/${driveId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load blood drive.');
  return body.data;
}

// POST /api/blood-drives
export async function createDrive(payload) {
  const res = await apiFetch('/api/blood-drives', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to create blood drive.');
  return body.data;
}

// PATCH /api/blood-drives/:id
export async function updateDrive(driveId, payload) {
  const res = await apiFetch(`/api/blood-drives/${driveId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to update blood drive.');
  return body.data;
}

// PATCH /api/blood-drives/:id/cancel
export async function cancelDrive(driveId, cancellationReason) {
  const res = await apiFetch(`/api/blood-drives/${driveId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ cancellation_reason: cancellationReason }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to cancel blood drive.');
  return body.data;
}

// GET /api/blood-drives/:id/participants
export async function getDriveParticipants(driveId) {
  const res = await apiFetch(`/api/blood-drives/${driveId}/participants`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load participants.');
  return body.data;
}

// POST /api/blood-drives/:id/participants
export async function addParticipant(driveId, userId, roleNotes = '') {
  const res = await apiFetch(`/api/blood-drives/${driveId}/participants`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role_notes: roleNotes }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to add participant.');
  return body.data;
}

// DELETE /api/blood-drives/:id/participants/:userId
export async function removeParticipant(driveId, userId) {
  const res = await apiFetch(`/api/blood-drives/${driveId}/participants/${userId}`, {
    method: 'DELETE',
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to remove participant.');
  return body.data;
}

// GET /api/volunteers/available?role=5&municipality=...
export async function getAvailableVolunteers(roleId, municipality = '') {
  const params = new URLSearchParams();
  if (roleId) params.set('role', roleId);
  if (municipality) params.set('municipality', municipality);
  const qs = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/api/volunteers/available${qs}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load available volunteers.');
  return body.data;
}

// GET /api/branches  (for branch dropdown on create form)
export async function getBranches() {
  const res = await apiFetch('/api/branches');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load branches.');
  return body.data;
}

// GET /api/blood-drives/:id/participants/suggestions?role_id=5&limit=20
export async function getSuggestedParticipants(driveId, roleId = '', limit = 20) {
  const params = new URLSearchParams();
  if (roleId) params.set('role_id', roleId);
  params.set('limit', limit);
  const res = await apiFetch(`/api/blood-drives/${driveId}/participants/suggestions?${params.toString()}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load suggestions.');
  return body.data;
}

// POST /api/blood-drives/:id/participants/bulk
// Mode A — manual selection: { user_ids: [1, 2, 3] }
// Mode B — auto-assign:      { target_count: 10, role_id: 5 }
export async function bulkAssign(driveId, payload) {
  const res = await apiFetch(`/api/blood-drives/${driveId}/participants/bulk`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to bulk assign participants.');
  return body.data;
}

// GET /api/blood-drives/:id/stats
export async function getDriveStats(driveId) {
  const res = await apiFetch(`/api/blood-drives/${driveId}/stats`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load drive stats.');
  return body.data;
}

// GET /api/blood-drives/my-assignments
// Volunteer/Phlebotomist only. Returns every drive assignment for the
// calling user — no params, scoped server-side via JWT. Used by the
// "My Assignments" page (Incoming / History tabs, split client-side).
export async function getMyAssignments() {
  const res = await apiFetch('/api/blood-drives/my-assignments');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load your assignments.');
  return body.data;
}

// PATCH /api/blood-drives/:id/participants/me
// Volunteer/Phlebotomist only. Self accept/decline — assignmentStatus
// must be 'Confirmed' or 'Declined' (backend rejects anything else).
export async function updateMyParticipationStatus(driveId, assignmentStatus) {
  const res = await apiFetch(`/api/blood-drives/${driveId}/participants/me`, {
    method: 'PATCH',
    body: JSON.stringify({ assignment_status: assignmentStatus }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to update your assignment status.');
  return body.data;
}