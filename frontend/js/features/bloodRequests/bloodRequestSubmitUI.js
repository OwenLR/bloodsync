import { showToast }             from '../../components/toast.js';
import { initSearchableDropdown } from '../../components/searchableDropdown.js';
import { openModal, closeModal } from '../../components/modal.js';
import { URGENCY_LEVEL }         from '../../constants/statusConstants.js';
import {
  DOCUMENT_TERMS_SUMMARY,
  DOCUMENT_AUTHENTICITY_TERMS,
} from '../../constants/documentAuthenticityTerms.js';
import { getAllHospitals }       from '../../features/hospitals/hospitalsApi.js';
import { submitBloodRequest }    from './bloodRequestApi.js';
import { validateSubmitForm, computeAgeFromBirthdate } from './bloodRequestValidation.js';

const SKELETON_ID     = 'submit-skeleton';
const FORM_ID         = 'submit-form';
const SUCCESS_ID      = 'submit-success';
const BACK_ID         = 'btn-submit-back';
const SUBMIT_BTN_ID   = 'btn-submit-final';
const BIRTHDATE_ID    = 'patient-birthdate';
const TERMS_CHECKBOX_ID   = 'document-terms-checkbox';
const TERMS_LEARN_MORE_ID = 'btn-document-terms-learn-more';

let _items       = null;
let _branchId    = null;
let _onBack      = null;
let _selectedHospital = null;
let _hospitalDropdown = null;
let _listenersBound   = false;

export async function initSubmitStep(items, branchId, onBack) {
  _items    = items;
  _branchId = branchId;
  _onBack   = onBack;
  _selectedHospital = null;

  document.getElementById(FORM_ID).style.display    = 'none';
  document.getElementById(SUCCESS_ID).style.display = 'none';
  showSkeleton();

  if (!_listenersBound) {
    document.getElementById(BACK_ID).addEventListener('click', () => _onBack());
    document.getElementById(FORM_ID).addEventListener('submit', handleSubmit);
    document.getElementById(TERMS_LEARN_MORE_ID).addEventListener('click', openDocumentTermsModal);
    document.getElementById(TERMS_CHECKBOX_ID).addEventListener('change', () => clearFieldError('documentTerms'));
    populateUrgencyOptions();
    _listenersBound = true;
  }

  document.getElementById('document-terms-summary').textContent = DOCUMENT_TERMS_SUMMARY;

  // Birthdate can't be in the future — same restriction bloodsync.md #41
  // applies to donor birthdate calendars. Set fresh each entry into this
  // step in case the page has been open across a date rollover.
  document.getElementById(BIRTHDATE_ID).max = todayDateString();

  clearAllErrors();
  document.getElementById(FORM_ID).reset();
  document.getElementById('urgency-level').value = URGENCY_LEVEL.ROUTINE;

  try {
    const hospitals = await getAllHospitals();
    hideSkeleton();
    document.getElementById(FORM_ID).style.display = '';
    setupHospitalDropdown(hospitals);
  } catch (err) {
    hideSkeleton();
    showToast(err.message, 'error');
  }
}

function todayDateString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function populateUrgencyOptions() {
  const select = document.getElementById('urgency-level');
  select.textContent = '';
  Object.values(URGENCY_LEVEL).forEach((level) => {
    const opt = document.createElement('option');
    opt.value = level;
    opt.textContent = level;
    select.appendChild(opt);
  });
}

function setupHospitalDropdown(hospitals) {
  if (_hospitalDropdown) {
    _hospitalDropdown.setItems(hospitals);
    _hospitalDropdown.clear();
    return;
  }

  _hospitalDropdown = initSearchableDropdown({
    inputId:      'hospital-input',
    listId:       'hospital-list',
    items:        hospitals,
    displayFn:    (h) => h.hospital_name,
    subDisplayFn: (h) => h.location || '',
    filterFn:     (h, q) => h.hospital_name.toLowerCase().includes(q),
    onSelect:     (h) => { _selectedHospital = h; clearFieldError('hospital'); },
    placeholder:  'Search hospital by name…',
    emptyMessage: 'No hospitals found.',
  });
}

// ---------------------------------------------------------------------------
// Document authenticity notice — "Learn more" opens this. Content lives in
// documentAuthenticityTerms.js, not here, per the same reasoning as
// termsAndConditions.js. Rendered with createElement/textContent only —
// never innerHTML — since the array-of-sections shape exists specifically
// to make that possible.
// ---------------------------------------------------------------------------

function openDocumentTermsModal() {
  const body = document.createElement('div');

  DOCUMENT_AUTHENTICITY_TERMS.forEach((section) => {
    const heading = document.createElement('h3');
    heading.textContent = section.heading;
    heading.style.marginTop = '16px';

    const paragraph = document.createElement('p');
    paragraph.textContent = section.body;

    body.appendChild(heading);
    body.appendChild(paragraph);
  });

  openModal('Document Authenticity Notice', body, [
    { label: 'Close', className: 'btn-secondary', onClick: closeModal },
  ]);
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

function handleSubmit(e) {
  e.preventDefault();
  clearAllErrors();

  const patientName      = document.getElementById('patient-name').value.trim();
  const patientBirthdate = document.getElementById(BIRTHDATE_ID).value;
  const diagnosis        = document.getElementById('diagnosis').value.trim();
  const urgencyLevel     = document.getElementById('urgency-level').value;
  const notes            = document.getElementById('notes').value.trim();
  const file             = document.getElementById('request-form-file').files[0] || null;
  const documentTermsAccepted = document.getElementById(TERMS_CHECKBOX_ID).checked;

  const errors = validateSubmitForm({
    hospital: _selectedHospital,
    patientName,
    patientBirthdate,
    urgencyLevel,
    file,
    documentTermsAccepted,
  });

  if (Object.keys(errors).length > 0) {
    Object.entries(errors).forEach(([field, message]) => showFieldError(field, message));
    return;
  }

  submit({ patientName, patientBirthdate, diagnosis, urgencyLevel, notes, file });
}

async function submit({ patientName, patientBirthdate, diagnosis, urgencyLevel, notes, file }) {
  const btn = document.getElementById(SUBMIT_BTN_ID);
  btn.disabled    = true;
  btn.textContent = 'Submitting…';

  const patientAge = computeAgeFromBirthdate(patientBirthdate);

  const formData = new FormData();
  formData.append('hospital_id',   _selectedHospital.hospital_id);
  formData.append('branch_id',     _branchId);
  formData.append('patient_name',  patientName);
  formData.append('patient_age',   patientAge);
  if (diagnosis)  formData.append('diagnosis', diagnosis);
  formData.append('urgency_level', urgencyLevel);
  if (notes) formData.append('notes', notes);
  formData.append('items', JSON.stringify(_items));
  formData.append('request_form', file);
  // fulfillment_type and preferred_branch_id intentionally omitted — see gotchas.md

  try {
    await submitBloodRequest(formData);
    document.getElementById(FORM_ID).style.display    = 'none';
    document.getElementById(SUCCESS_ID).style.display = '';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Submit Request';
  }
}

// ---------------------------------------------------------------------------
// Field error helpers
// ---------------------------------------------------------------------------

function showFieldError(field, message) {
  const el = document.getElementById(`error-${field}`);
  if (el) el.textContent = message;
}

function clearFieldError(field) {
  const el = document.getElementById(`error-${field}`);
  if (el) el.textContent = '';
}

function clearAllErrors() {
  ['hospital', 'patientName', 'patientBirthdate', 'urgencyLevel', 'file', 'documentTerms'].forEach(clearFieldError);
}

function showSkeleton() { document.getElementById(SKELETON_ID).style.display = ''; }
function hideSkeleton() { document.getElementById(SKELETON_ID).style.display = 'none'; }