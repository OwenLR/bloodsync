/**
 * adminStaffValidation.js — Client-side validation for Create Staff
 * Account form. Mirrors userValidator.js's validateCreateUser for the
 * fields backend itself checks. branch_id-required-for-PRC-Staff is a
 * frontend-only business rule — backend's validateCreateUser doesn't
 * enforce it (branch_id is optional in the schema), but a PRC Staff
 * account without a branch can't do branch-scoped work, so this page
 * requires it client-side.
 *
 * Path: frontend/js/features/userManagement/adminStaffValidation.js
 */

import { ROLES } from '../../constants/roles.js';

export function validateCreateStaffForm(data) {
  const errors = [];
  const { first_name, last_name, email, role_id, branch_id } = data;

  if (!first_name || first_name.trim() === '') errors.push({ field: 'first_name', message: 'First name is required.' });
  if (!last_name || last_name.trim() === '')   errors.push({ field: 'last_name',  message: 'Last name is required.' });

  if (!email || email.trim() === '') {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Enter a valid email address.' });
  }

  if (!role_id) {
    errors.push({ field: 'role_id', message: 'Role is required.' });
  }

  if (Number(role_id) === ROLES.PRC_STAFF && !branch_id) {
    errors.push({ field: 'branch_id', message: 'Branch is required for PRC Staff accounts.' });
  }

  return errors;
}