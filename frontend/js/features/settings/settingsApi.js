/**
 * settingsApi.js — API calls for the Settings feature.
 *
 * Covers:
 *   - PATCH /api/auth/me/password  — change own password (all roles)
 *   - PATCH /api/users/me/profile-img — update profile photo (Admin + PRC Staff)
 *
 * Returns parsed response data. No DOM, no business logic.
 */

import { apiFetch } from '../../core/api.js';

/**
 * Change the current user's password.
 *
 * @param {string} currentPassword
 * @param {string} newPassword
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
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
 * Upload a new profile photo for the current Admin or PRC Staff user.
 *
 * @param {File} file — must be jpeg/png/jpg/pdf, max 5MB
 * @returns {Promise<{ res: Response, body: object }>}
 */
export async function updateProfilePhoto(file) {
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