/**
 * profileApi.js — API calls for the Profile feature (all 5 roles).
 *
 * Covers:
 *   - PATCH /api/auth/me/password        — change own password (all roles)
 *   - GET /api/volunteers/me/profile     — full profile (Vol/Phleb only)
 *   - PATCH /api/users/me/profile-img    — photo update (PRC Staff only —
 *     Admin deliberately excluded on the frontend, see sessionState.md;
 *     backend technically allows Admin too via this same route)
 *   - PATCH /api/volunteers/me/profile   — photo update, multipart
 *     (Vol/Phleb; Stage 4 sends profile_img only, Stage 5 adds address
 *     fields to the same call)
 *
 * Admin and Requestor have no photo upload call here by design (Admin:
 * deliberate frontend narrowing; Requestor: no photo support anywhere in
 * the system, per navbar.js).
 *
 * Returns parsed response data. No DOM, no business logic.
 * Migrated from features/settings/settingsApi.js — Settings is retired
 * once all 5 Profile pages are live (see sessionState.md).
 */

import { apiFetch } from '../../core/api.js';

/**
 * Fetch the authenticated Volunteer/Phlebotomist's full profile —
 * includes every field captured at registration (address, nationality,
 * education, occupation, id_type, emergency contact, profile_img,
 * status) per contract.md's GET /api/volunteers/me/profile.
 *
 * @returns {Promise<object>} the profile data
 * @throws {Error} on network failure or a non-success response
 */
export async function getMyVolunteerProfile() {
  const res  = await apiFetch('/api/volunteers/me/profile', { method: 'GET' });
  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Could not load your profile.');
  }

  return body.data;
}

/**
 * Change the current user's password. Identical endpoint/behavior for
 * all 5 roles.
 *
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<{ res: Response, body: object }>}
 */
export async function changePassword(currentPassword, newPassword) {
  const res  = await apiFetch('/api/auth/me/password', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  const body = await res.json();
  return { res, body };
}

/**
 * Upload a new profile photo for the current PRC Staff user.
 *
 * @param {File} file — must be jpeg/png/jpg/pdf, max 5MB
 * @returns {Promise<{ res: Response, body: object }>}
 */
export async function updateStaffPhoto(file) {
  const formData = new FormData();
  formData.append('profile_img', file);

  // Do NOT set Content-Type — apiFetch detects FormData and omits it
  const res  = await apiFetch('/api/users/me/profile-img', {
    method: 'PATCH',
    body:   formData,
  });
  const body = await res.json();
  return { res, body };
}

/**
 * Upload a new profile photo for the current Volunteer/Phlebotomist.
 * Same endpoint used for address/contact edits in Stage 5 — this call
 * sends profile_img only, relying on the backend fix (this session) that
 * makes a file-only, empty-body request valid.
 *
 * @param {File} file — must be jpeg/png/jpg/pdf, max 5MB
 * @returns {Promise<{ res: Response, body: object }>}
 */
export async function updateVolunteerPhoto(file) {
  const formData = new FormData();
  formData.append('profile_img', file);

  const res  = await apiFetch('/api/volunteers/me/profile', {
    method: 'PATCH',
    body:   formData,
  });
  const body = await res.json();
  return { res, body };
}