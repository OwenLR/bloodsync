/**
 * userApprovalDetailUI.js — Pending Vol/Phleb registration review page.
 *
 * Gmail-style detail page (?id= + URLSearchParams), same pattern as
 * Blood Requests Staff Management → Detail (sessionState.md precedent) —
 * a full profile + document review, not a quick-glance modal.
 *
 * Approve/Decline are both no-body PATCH calls — decline has no reason
 * field (confirmed via registrationService.js's declineRegistration()),
 * unlike Blood Requests' reject flow. Decline still gets a confirmModal
 * since it's a meaningful, hard-to-undo action (user must re-register
 * from scratch per bloodsync.md #8), just without a reason-required modal.
 *
 * Two separate uses of profile_img on this page:
 * - Header avatar: small identity photo next to the name, initials
 *   fallback when absent — same pattern as usersManageUI.js's list rows.
 * - Document section: the actual submitted proof-of-license file for
 *   review. Stays "No document submitted" when genuinely absent (e.g.
 *   Volunteer registrations don't require one — see
 *   fieldRegistrationValidation.js) — this is a real fact, not a bug.
 *
 * profile_img may be an image (jpeg/png) or a PDF (Phlebotomist license
 * document) — isImageUrl() branches display accordingly. PDFs use a
 * plain new-tab link, same CSP frame-src gap reasoning as the Blood
 * Requests detail page (see architecture.md).
 *
 * Path: frontend/js/features/userManagement/userApprovalDetailUI.js
 */

import { confirmModal }  from '../../components/modal.js';
import { showToast }     from '../../components/toast.js';
import { ROUTES }        from '../../constants/routes.js';
import {
  getVolunteerProfile,
  approveRegistration,
  declineRegistration,
} from './volunteerRegistrationApi.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

let _userId = null;

export async function initUserApprovalDetail() {
  _userId = new URLSearchParams(window.location.search).get('id');

  document.getElementById('btn-back').addEventListener('click', () => {
    window.location.href = ROUTES.ADMIN.USERS;
  });

  if (!_userId) {
    showError('No registration specified.');
    return;
  }

  await loadProfile();

  document.getElementById('btn-approve').addEventListener('click', handleApprove);
  document.getElementById('btn-decline').addEventListener('click', handleDecline);
}

async function loadProfile() {
  document.getElementById('detail-error').textContent = '';
  try {
    const profile = await getVolunteerProfile(_userId);
    renderProfile(profile);
    document.getElementById('detail-content').style.display = '';
  } catch (err) {
    document.getElementById('detail-content').style.display = 'none';
    showError(err.message || 'Could not load this registration.');
  }
}

function renderProfile(p) {
  document.getElementById('detail-name').textContent = `${p.first_name} ${p.last_name}`;

  const roleBadge = document.getElementById('detail-role-badge');
  roleBadge.textContent = p.role_name;
  roleBadge.className   = 'status-badge status-badge--pending';

  renderAvatar(p);

  fillGrid('detail-account-grid', [
    ['Email', p.email],
    ['Status', p.status],
  ]);

  fillGrid('detail-personal-grid', [
    ['Birthdate', formatDate(p.birthdate)],
    ['Sex', p.sex],
    ['Contact', p.contact],
    ['Nationality', p.nationality],
    ['Education', p.education],
    ['Occupation', p.occupation],
  ]);

  fillGrid('detail-address-grid', [
    ['Street', p.address_street],
    ['Barangay', p.address_brgy],
    ['City/Municipality', p.address_municipality],
    ['Province', p.address_province],
    ['ZIP Code', p.zip_code],
  ]);

  fillGrid('detail-emergency-grid', [
    ['Name', p.emergency_contact_name],
    ['Phone', p.emergency_contact_phone],
  ]);

  renderDocument(p);
}

// ---------------------------------------------------------------------------
// Header avatar — identity photo, initials fallback
// ---------------------------------------------------------------------------

function renderAvatar(p) {
  const wrap = document.getElementById('detail-avatar-wrap');
  wrap.textContent = '';

  if (p.profile_img && isImageUrl(p.profile_img)) {
    const img = document.createElement('img');
    img.src = p.profile_img;
    img.alt = `${p.first_name} ${p.last_name}`;
    img.className = 'avatar-thumb-lg';
    wrap.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'avatar-placeholder-lg';
    placeholder.textContent = initials(p.first_name, p.last_name);
    wrap.appendChild(placeholder);
  }
}

function initials(firstName, lastName) {
  const a = (firstName || '').charAt(0);
  const b = (lastName || '').charAt(0);
  return (a + b).toUpperCase() || '?';
}

// ---------------------------------------------------------------------------
// Document section — the actual submitted proof-of-license file
// ---------------------------------------------------------------------------

function renderDocument(p) {
  const docLink  = document.getElementById('detail-document-link');
  const docEmpty = document.getElementById('detail-document-empty');
  const docImg   = document.getElementById('detail-document-thumb');

  if (!p.profile_img) {
    docImg.style.display   = 'none';
    docLink.style.display  = 'none';
    docEmpty.style.display = '';
    return;
  }

  docEmpty.style.display = 'none';

  if (isImageUrl(p.profile_img)) {
    docImg.src   = p.profile_img;
    docImg.alt   = `${p.first_name} ${p.last_name}'s submitted document`;
    docImg.style.display = '';
    docLink.href = p.profile_img;
    docLink.textContent = 'View Full Size';
    docLink.style.display = '';
  } else {
    // PDF — no frame-src in CSP, inline preview isn't possible
    // (see architecture.md) — same new-tab pattern as Blood Requests detail.
    docImg.style.display  = 'none';
    docLink.href = p.profile_img;
    docLink.textContent = 'Open Document (PDF)';
    docLink.style.display = '';
  }
}

function isImageUrl(url) {
  const lower = url.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.includes(ext));
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function fillGrid(elementId, pairs) {
  const dl = document.getElementById(elementId);
  dl.textContent = '';
  pairs.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value || '—';
    dl.appendChild(dt);
    dl.appendChild(dd);
  });
}

async function handleApprove() {
  const confirmed = await confirmModal(
    'Approve this registration? The account will become active immediately.',
    'Approve',
    'Cancel',
    false
  );
  if (!confirmed) return;

  try {
    await approveRegistration(_userId);
    showToast('Registration approved.', 'success');
    window.location.href = ROUTES.ADMIN.USERS;
  } catch (err) {
    showToast(err.message || 'Failed to approve registration.', 'error');
  }
}

async function handleDecline() {
  const confirmed = await confirmModal(
    'Decline this registration? The applicant will need to re-register to try again.',
    'Decline',
    'Cancel',
    true
  );
  if (!confirmed) return;

  try {
    await declineRegistration(_userId);
    showToast('Registration declined.', 'success');
    window.location.href = ROUTES.ADMIN.USERS;
  } catch (err) {
    showToast(err.message || 'Failed to decline registration.', 'error');
  }
}

function showError(message) {
  document.getElementById('detail-error').textContent = message;
}

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}