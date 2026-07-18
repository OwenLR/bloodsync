/**
 * fieldRegistrationApi.js — Volunteer/Phlebotomist self-registration.
 * Shared by both roles — only the endpoint differs; fields are identical
 * per contract.md's Registration Endpoints section.
 *
 * multipart/form-data — body is a FormData instance, so apiFetch's
 * buildConfig() correctly skips the Content-Type header for this call
 * (see api.js buildConfig — checks `options.body instanceof FormData`).
 *
 * Path: frontend/js/features/registration/fieldRegistrationApi.js
 */

import { apiFetch } from '../../core/api.js';

const ENDPOINTS = {
  volunteer:    '/api/volunteers/register',
  phlebotomist: '/api/phlebotomists/register',
};

// role: 'volunteer' | 'phlebotomist'
// formData: FormData instance (built by fieldRegistrationUI.js)
export async function registerFieldRole(role, formData) {
  const endpoint = ENDPOINTS[role];
  if (!endpoint) throw new Error('Invalid registration role.');

  const res  = await apiFetch(endpoint, {
    method: 'POST',
    body:   formData,
  });
  const body = await res.json();

  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Registration failed. Please try again.');
  }

  return body.data;
}