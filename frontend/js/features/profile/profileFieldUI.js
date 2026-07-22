/**
 * profileFieldUI.js — DOM rendering for Volunteer/Phlebotomist's Profile
 * page. Kept separate from profileUI.js because Vol/Phleb have a much
 * larger field set (full registration data) than Admin/Staff/Requestor's
 * simple identity block.
 *
 * Sourced from GET /api/volunteers/me/profile (contract.md — includes
 * every field captured at registration: birthdate, sex, contact, address,
 * zip, nationality, education, occupation, id_type, emergency contact,
 * profile_img, status). Identity fields (name/birthdate/sex) are shown
 * here for reference only — they're locked server-side
 * (volunteerProfileValidator.js's LOCKED_FIELDS), same "contact an
 * admin" convention as the registration form.
 *
 * initPhotoForm() added this session — relies on the backend fix to
 * volunteerProfileController.js/volunteerProfileValidator.js that makes
 * a file-only (empty body) PATCH /api/volunteers/me/profile request
 * valid, since this form sends profile_img alone, no other fields.
 *
 * Address editing (Stage 5) extends this file later — not yet wired here.
 */

import { getMyVolunteerProfile, updateVolunteerPhoto } from './profileApi.js';
import { validateProfilePhoto }                        from './profileValidation.js';
import { showToast }                                    from '../../components/toast.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

/**
 * Fetch and render the full Vol/Phleb profile as read-only text.
 * Returns the fetched profile object so later stages (address edit)
 * can reuse it without a second fetch.
 *
 * @returns {Promise<object|null>} the profile data, or null on failure
 */
export async function loadAndRenderProfile() {
  try {
    const profile = await getMyVolunteerProfile();
    renderProfile(profile);
    return profile;
  } catch (err) {
    showToast(err.message || 'Could not load your profile.', 'error');
    return null;
  }
}

function renderProfile(profile) {
  setText('profile-name', `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '—');
  setText('profile-email', profile.email || '—');
  setText('profile-role-label', profile.role_name || '—');
  setText('profile-status', profile.status || '—');
  setText('profile-birthdate', formatDate(profile.birthdate));
  setText('profile-sex', profile.sex || '—');

  setText('profile-contact', profile.contact || '—');

  setText('profile-address-street', profile.address_street || '—');
  setText('profile-address-brgy', profile.address_brgy || '—');
  setText('profile-address-municipality', profile.address_municipality || '—');
  setText('profile-address-province', profile.address_province || '—');
  setText('profile-zip-code', profile.zip_code || '—');

  setText('profile-nationality', profile.nationality || '—');
  setText('profile-education', profile.education || '—');
  setText('profile-occupation', profile.occupation || '—');
  setText('profile-id-type', profile.id_type || '—'); // only present on Phlebotomist's page

  setText('profile-emergency-name', profile.emergency_contact_name || '—');
  setText('profile-emergency-phone', profile.emergency_contact_phone || '—');

  renderAvatar(profile);
}

function renderAvatar(profile) {
  const img         = document.getElementById('profile-avatar');
  const placeholder = document.getElementById('profile-avatar-placeholder');
  if (!img && !placeholder) return;

  const isImage = profile.profile_img && IMAGE_EXTENSIONS.some(ext => profile.profile_img.toLowerCase().includes(ext));

  if (isImage) {
    if (img) {
      img.src = profile.profile_img;
      img.classList.remove('field-error-hidden');
    }
    if (placeholder) placeholder.classList.add('field-error-hidden');
  } else if (profile.profile_img) {
    // Non-image (PDF) document on file — no thumbnail, show a link instead
    const linkWrap = document.getElementById('profile-avatar-doc-link');
    if (linkWrap) {
      linkWrap.href = profile.profile_img;
      linkWrap.classList.remove('field-error-hidden');
    }
    if (img) img.classList.add('field-error-hidden');
    if (placeholder) placeholder.classList.add('field-error-hidden');
  } else {
    if (img) img.classList.add('field-error-hidden');
    if (placeholder) {
      placeholder.textContent = initials(profile.first_name, profile.last_name);
      placeholder.classList.remove('field-error-hidden');
    }
  }
}

function initials(firstName, lastName) {
  const a = (firstName || '').charAt(0);
  const b = (lastName || '').charAt(0);
  return (a + b).toUpperCase() || '?';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatDate(isoOrDateString) {
  if (!isoOrDateString) return '—';
  return String(isoOrDateString).slice(0, 10);
}

// ---------------------------------------------------------------------------
// Photo/document upload — Volunteer + Phlebotomist
// ---------------------------------------------------------------------------

function setButtonLoading(btn, loadingText) {
  btn.disabled = true;
  btn.dataset.originalText = btn.textContent;
  btn.textContent = loadingText;
}

function restoreButton(btn) {
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || 'Save';
}

export function initPhotoForm() {
  const form        = document.getElementById('photo-form');
  const fileInput   = document.getElementById('profile-img-input');
  const preview     = document.getElementById('photo-preview');
  const previewWrap = document.getElementById('photo-preview-wrap');
  const submitBtn   = document.getElementById('btn-upload-photo');
  const errorEl     = document.getElementById('error-photo-form');

  if (!form) return;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    errorEl.textContent = '';
    errorEl.classList.add('field-error-hidden');

    if (!file) {
      previewWrap.classList.add('photo-preview-hidden');
      return;
    }

    const { valid, error } = validateProfilePhoto(file);
    if (!valid) {
      errorEl.textContent = error;
      errorEl.classList.remove('field-error-hidden');
      fileInput.value = '';
      previewWrap.classList.add('photo-preview-hidden');
      return;
    }

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        previewWrap.classList.remove('photo-preview-hidden');
      };
      reader.readAsDataURL(file);
    } else {
      preview.removeAttribute('src');
      previewWrap.classList.remove('photo-preview-hidden');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    errorEl.textContent = '';
    errorEl.classList.add('field-error-hidden');

    const { valid, error } = validateProfilePhoto(file ?? null);
    if (!valid) {
      errorEl.textContent = error;
      errorEl.classList.remove('field-error-hidden');
      return;
    }

    setButtonLoading(submitBtn, 'Uploading…');

    try {
      const { res, body } = await updateVolunteerPhoto(file);

      if (!res.ok || !body.success) {
        const msg = res.status === 500
          ? 'An unexpected error occurred. Please try again or contact support if the problem persists.'
          : (body.message || 'Photo could not be uploaded. Please try again.');
        errorEl.textContent = msg;
        errorEl.classList.remove('field-error-hidden');
        return;
      }

      // body.data is the full updated profile row (profileModel.updateProfile's
      // RETURNING *) — reuse the same renderAvatar() the initial load uses.
      renderAvatar(body.data);

      showToast('Photo updated successfully.', 'success');
      form.reset();
      previewWrap.classList.add('photo-preview-hidden');

    } catch {
      errorEl.textContent = 'An unexpected error occurred. Please try again or contact support if the problem persists.';
      errorEl.classList.remove('field-error-hidden');
    } finally {
      restoreButton(submitBtn);
    }
  });
}