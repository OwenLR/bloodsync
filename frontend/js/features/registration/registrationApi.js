/**
 * registrationApi.js — Requestor self-registration API calls.
 *
 * Public endpoint (no verifyToken middleware on the backend route), but
 * per rules.md's Layer Responsibilities every features/*Api.js file goes
 * through apiFetch regardless — this route simply never triggers apiFetch's
 * 401/refresh path since it can never return a 401.
 *
 * Path: frontend/js/features/registration/registrationApi.js
 */

import { apiFetch } from '../../core/api.js';

const BASE = '/api/requestors/register';

// POST /api/requestors/register
// Request: first_name, last_name, email, password, contact (contact optional)
// Success: { success: true, data: { user_id, first_name, last_name, email,
//   role_id, status }, message }
// Error: { success: false, message: <single string> } — ALWAYS 400 in the
// current backend code, including for duplicate email. See registrationController.js's
// registerRequestor — its catch-all calls response.badRequest() unconditionally,
// so no path currently reaches 409 despite contract.md documenting one.
export async function registerRequestor(formData) {
  const res  = await apiFetch(BASE, {
    method: 'POST',
    body:   JSON.stringify(formData),
  });
  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Registration failed. Please try again.');
  }

  return body.data;
}