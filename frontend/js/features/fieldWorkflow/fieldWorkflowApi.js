/**
 * fieldWorkflowApi.js
 *
 * All API calls for the field donor workflow:
 *   Donor registration, interview, interview answers,
 *   screening, donation, blood collection.
 *
 * No DOM, no business logic, no validation here.
 * Returns parsed data or throws Error with backend message.
 */

import { apiFetch } from '../../core/api.js';

// ─── Donors ──────────────────────────────────────────────────────────────────

/**
 * Get all donors.
 * Used for the donor selector dropdowns on field workflow pages.
 * @returns {Promise<Array>}
 */
export async function getAllDonors() {
  const res  = await apiFetch('/api/donors');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load donors.');
  return body.data || [];
}

/**
 * Update a donor's full details (Admin + PRC Staff only).
 * Used on the registration page when an Admin or Staff updates contact info
 * for an existing donor — the contact-only endpoint rejects their role.
 * @param {number} donorId
 * @param {{ email?: string, contact?: string }} data
 * @returns {Promise<Object>}
 */
export async function updateDonorFull(donorId, data) {
  const res  = await apiFetch(`/api/donors/${donorId}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to update donor.');
  return body.data;
}

/**
 * Search donors by name or ID number.
 * Used for the search bar on the registration page.
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchDonors(query) {
  const res  = await apiFetch(`/api/donors/search?q=${encodeURIComponent(query)}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Search failed.');
  return body.data;
}

/**
 * Get a single donor by ID.
 * Used to auto-fill the registration form when an existing donor is selected.
 * @param {number} donorId
 * @returns {Promise<Object>}
 */
export async function getDonorById(donorId) {
  const res  = await apiFetch(`/api/donors/${donorId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Donor not found.');
  return body.data;
}

/**
 * Get walk-in (Staff, non-drive) cycle status for a donor — resolves
 * whether their most recent walk-in interview/screening/donation chain
 * is in-progress, in a deferral cooldown, or fully available for a new
 * interview. Not used for Volunteer/Phlebotomist drive-scoped flows.
 * @param {number} donorId
 * @returns {Promise<{state: string, [key: string]: any}>}
 */
export async function getDonorCycleStatus(donorId) {
  const res  = await apiFetch(`/api/donors/${donorId}/cycle-status`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load donor cycle status.');
  return body.data;
}

/**
 * Create a new donor.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createDonor(data) {
  const res  = await apiFetch('/api/donors', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    const err  = new Error(body.message || 'Failed to register donor.');
    err.status = res.status;
    throw err;
  }
  return body.data;
}

/**
 * Update donor contact info only (Volunteer + Phlebotomist).
 * Only accepts email and contact fields — backend rejects anything else.
 * @param {number} donorId
 * @param {{ email?: string, contact?: string }} data
 * @returns {Promise<Object>}
 */
export async function updateDonorContact(donorId, data) {
  const res  = await apiFetch(`/api/donors/${donorId}/contact`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to update contact info.');
  return body.data;
}

// ─── Donor Interviews ─────────────────────────────────────────────────────────

/**
 * Get all interviews for a specific donor.
 * Used to check if this donor already has an interview in the current drive.
 * @param {number} donorId
 * @returns {Promise<Array>}
 */
export async function getInterviewsByDonor(donorId) {
  const res  = await apiFetch(`/api/donor-interviews/donor/${donorId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load interviews.');
  return body.data;
}

/**
 * Get all interviews (for the current drive context — backend scopes by drive).
 * Used to populate the donor selector on the interview page.
 * @returns {Promise<Array>}
 */
export async function getAllInterviews() {
  const res  = await apiFetch('/api/donor-interviews');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load interviews.');
  return body.data;
}

/**
 * Create a new donor interview.
 * drive_id is set automatically by bloodDriveMiddleware — do not send it.
 * @param {{ donor_id: number, branch_id: number }} data
 * @returns {Promise<Object>}
 */
export async function createInterview(data) {
  const res  = await apiFetch('/api/donor-interviews', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    const err  = new Error(body.message || 'Failed to create interview.');
    err.status = res.status;
    throw err;
  }
  return body.data;
}

// ─── Interview Questions ──────────────────────────────────────────────────────

/**
 * Get interview questions filtered by donor sex.
 * @param {'Male'|'Female'} sex
 * @returns {Promise<Array>}
 */
export async function getQuestionsBySex(sex) {
  const res  = await apiFetch(`/api/interview-questions/sex/${encodeURIComponent(sex)}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load questions.');
  return body.data;
}

// ─── Interview Answers ────────────────────────────────────────────────────────

/**
 * Submit interview answers.
 * answer values must be exactly "YES" or "NO" (uppercase).
 * @param {{ interview_id: number, donor_id: number, answers: Array }} data
 * @returns {Promise<Object>}
 */
export async function submitAnswers(data) {
  const res  = await apiFetch('/api/interview-answers', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    const err  = new Error(body.message || 'Failed to submit answers.');
    err.status = res.status;
    throw err;
  }
  return body.data;
}

// ─── Screenings ───────────────────────────────────────────────────────────────

/**
 * Get all screenings for a specific donor.
 * @param {number} donorId
 * @returns {Promise<Array>}
 */
export async function getScreeningsByDonor(donorId) {
  const res  = await apiFetch(`/api/screenings/donor/${donorId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load screenings.');
  return body.data;
}

/**
 * Get all screenings (backend scopes to current drive for field roles).
 * Used to populate donor selector on the screening page.
 * @returns {Promise<Array>}
 */
export async function getAllScreenings() {
  const res  = await apiFetch('/api/screenings');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load screenings.');
  return body.data;
}

/**
 * Create a new screening record.
 * @param {Object} data
 * @returns {Promise<Object>}
 */
export async function createScreening(data) {
  const res  = await apiFetch('/api/screenings', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    const err  = new Error(body.message || 'Failed to create screening.');
    err.status = res.status;
    throw err;
  }
  return body.data;
}

// ─── Donations ────────────────────────────────────────────────────────────────

/**
 * Get all donations for a specific donor.
 * @param {number} donorId
 * @returns {Promise<Array>}
 */
export async function getDonationsByDonor(donorId) {
  const res  = await apiFetch(`/api/donations/donor/${donorId}`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load donations.');
  return body.data;
}

/**
 * Get all donations (backend scopes to current drive for field roles).
 * @returns {Promise<Array>}
 */
export async function getAllDonations() {
  const res  = await apiFetch('/api/donations');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load donations.');
  return body.data;
}

/**
 * Create a new donation record.
 * donor_id and branch_id are auto-filled server-side — do not send them.
 * extraction_time_seconds is the TOTAL extraction duration in seconds
 * (minutes*60 + seconds) — combine the two form inputs into this single
 * value before calling. See donationRules.js / medicalRules.js for the
 * QNS threshold this is compared against server-side.
 * @param {{ screening_id: number, extraction_time_seconds: number }} data
 * @returns {Promise<Object>}
 */
export async function createDonation(data) {
  const res  = await apiFetch('/api/donations', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    const err  = new Error(body.message || 'Failed to record donation.');
    err.status = res.status;
    throw err;
  }
  return body.data;
}

// ─── Blood Collections ────────────────────────────────────────────────────────

/**
 * Get all blood collections (backend scopes to current drive for field roles).
 * @returns {Promise<Array>}
 */
export async function getAllCollections() {
  const res  = await apiFetch('/api/blood-collections');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load collections.');
  return body.data;
}

/**
 * Create a new blood collection record.
 * @param {{ donation_id: number, blood_type: string, component: string, volume_ml: number }} data
 * @returns {Promise<Object>}
 */
export async function createCollection(data) {
  const res  = await apiFetch('/api/blood-collections', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    const err  = new Error(body.message || 'Failed to record collection.');
    err.status = res.status;
    throw err;
  }
  return body.data;
}
// ─── Blood Drives (for phlebotomist lookup) ───────────────────────────────────

/**
 * Get the current user's active blood drive.
 * For field roles: backend scopes GET /api/blood-drives to their assignments,
 * so we just filter to the first Ongoing drive.
 * For Admin/Staff: returns the first Ongoing drive (may be null for walk-ins).
 * @returns {Promise<Object|null>}
 */
export async function getMyActiveDrive() {
  const res  = await apiFetch('/api/blood-drives');
  const body = await res.json();
  if (!res.ok || !body.success) return null;
  const drives = body.data || [];
  return drives.find(d => d.status === 'Ongoing') || null;
}

/**
 * Get participants for a blood drive, filtered to Phlebotomists only.
 * Used to populate the "Performed By" dropdown on the donation page.
 * @param {number} driveId
 * @returns {Promise<Array>}
 */
export async function getDrivePhlebotomists(driveId) {
  const res  = await apiFetch(`/api/blood-drives/${driveId}/participants`);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load participants.');
  const participants = body.data || [];
  // Filter to Phlebotomists (role_id 6) with Confirmed or Assigned status
  return participants.filter(p =>
    p.role_id === 6 &&
    (p.assignment_status === 'Confirmed' || p.assignment_status === 'Assigned')
  );
}

/**
 * Get all available phlebotomists (Admin/Staff walk-in fallback).
 * Used when there is no active drive to scope the participant list.
 * @returns {Promise<Array>}
 */
export async function getAvailablePhlebotomists() {
  const res  = await apiFetch('/api/volunteers/available?role=6');
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load phlebotomists.');
  return body.data || [];
}