import { showToast }             from '../../components/toast.js';
import { initSearchableDropdown } from '../../components/searchableDropdown.js';
import { URGENCY_LEVEL }         from '../../constants/statusConstants.js';
import { getAllHospitals }       from '../../features/hospitals/hospitalsApi.js';
import { submitBloodRequest }    from './bloodRequestApi.js';
import { validateSubmitForm }    from './bloodRequestValidation.js';

const SKELETON_ID     = 'submit-skeleton';
const FORM_ID         = 'submit-form';
const SUCCESS_ID      = 'submit-success';
const BACK_ID         = 'btn-submit-back';
const SUBMIT_BTN_ID   = 'btn-submit-final';

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
    populateUrgencyOptions();
    _listenersBound = true;
  }

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
// Submit
// ---------------------------------------------------------------------------

function handleSubmit(e) {
  e.preventDefault();
  clearAllErrors();

  const patientName  = document.getElementById('patient-name').value.trim();
  const patientAge   = document.getElementById('patient-age').value.trim();
  const diagnosis    = document.getElementById('diagnosis').value.trim();
  const urgencyLevel = document.getElementById('urgency-level').value;
  const notes        = document.getElementById('notes').value.trim();
  const file         = document.getElementById('request-form-file').files[0] || null;

  const errors = validateSubmitForm({
    hospital: _selectedHospital,
    patientName,
    urgencyLevel,
    file,
  });

  if (Object.keys(errors).length > 0) {
    Object.entries(errors).forEach(([field, message]) => showFieldError(field, message));
    return;
  }

  submit({ patientName, patientAge, diagnosis, urgencyLevel, notes, file });
}

async function submit({ patientName, patientAge, diagnosis, urgencyLevel, notes, file }) {
  const btn = document.getElementById(SUBMIT_BTN_ID);
  btn.disabled    = true;
  btn.textContent = 'Submitting…';

  const formData = new FormData();
  formData.append('hospital_id',   _selectedHospital.hospital_id);
  formData.append('branch_id',     _branchId);
  formData.append('patient_name',  patientName);
  if (patientAge) formData.append('patient_age', patientAge);
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
  ['hospital', 'patientName', 'urgencyLevel', 'file'].forEach(clearFieldError);
}

function showSkeleton() { document.getElementById(SKELETON_ID).style.display = ''; }
function hideSkeleton() { document.getElementById(SKELETON_ID).style.display = 'none'; }