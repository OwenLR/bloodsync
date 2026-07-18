/**
 * volunteerRegistrationApi.js — Admin-side Volunteer/Phlebotomist
 * account list + registration approval review.
 *
 * Two separate data sources, per contract.md:
 * - GET /api/volunteers/available  → Active Vol/Phleb accounts
 *   (role_id IN (5,6), is_active=true, status='Active' — enforced
 *   server-side in profileModel.getAvailableVolunteers(), no frontend filter)
 * - GET /api/volunteers/pending    → Pending registrations awaiting review
 *
 * Approve/decline are no-body PATCH calls — decline has no reason field
 * (confirmed via registrationService.js's declineRegistration(), unlike
 * Blood Requests' reject flow which requires denial_reason).
 *
 * Path: frontend/js/features/userManagement/volunteerRegistrationApi.js
 */

import { apiFetch } from '../../core/api.js';

const BASE = '/api/volunteers';

// GET /api/volunteers/available [Admin, Staff]
// Fields: user_id, first_name, last_name, role_id, role_name, email,
// contact, address_municipality, address_province, profile_img
export async function getActiveVolunteers() {
  const res  = await apiFetch(`${BASE}/available`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load active users.');
  return body.data;
}

// GET /api/volunteers/pending [Admin]
// Fields: full volunteer_profiles row + first_name, last_name, email,
// status, is_active, role_name, role_id
export async function getPendingRegistrations() {
  const res  = await apiFetch(`${BASE}/pending`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load pending registrations.');
  return body.data;
}

// GET /api/volunteers/:id/profile [Admin]
// :id is user_id, not a separate profile_id — confirmed via
// profileModel.getProfileByUserId(userId).
export async function getVolunteerProfile(userId) {
  const res  = await apiFetch(`${BASE}/${userId}/profile`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load profile details.');
  return body.data;
}

// PATCH /api/volunteers/:id/approve [Admin] — no body
export async function approveRegistration(userId) {
  const res  = await apiFetch(`${BASE}/${userId}/approve`, { method: 'PATCH' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to approve registration.');
  return body.data;
}

// PATCH /api/volunteers/:id/decline [Admin] — no body, no reason field
export async function declineRegistration(userId) {
  const res  = await apiFetch(`${BASE}/${userId}/decline`, { method: 'PATCH' });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to decline registration.');
  return body.data;
}