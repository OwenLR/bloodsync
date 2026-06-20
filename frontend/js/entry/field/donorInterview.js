import { requireAuth }       from '../../core/guards/authGuard.js';
import { requireRole }        from '../../core/guards/roleGuard.js';
import { renderNavbar }       from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }       from '../../layouts/sidebar.js';
import { revealAppShell }     from '../../layouts/appShell.js';
import { getSidebarItems }    from '../../constants/sidebarItems.js';
import { ROLES }              from '../../constants/roles.js';
import { showToast }          from '../../components/toast.js';
import {
  searchDonors,
  getDonorById,
  getInterviewsByDonor,
  createInterview,
  getQuestionsBySex,
  submitAnswers,
} from '../../features/fieldWorkflow/fieldWorkflowApi.js';
import {
  validateInterview,
  validateAnswers,
} from '../../features/fieldWorkflow/fieldWorkflowValidation.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _user            = null;
let _selectedDonor   = null;
let _createdInterview = null;   // interview record after createInterview()
let _questions       = [];      // loaded questions for the selected donor's sex

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  _user = await requireAuth();
  if (!_user) return;

  if (!requireRole(_user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST])) return;

  renderNavbar(_user, 0);
  clearSidebar();
  renderSidebar(getSidebarItems(_user.role_id, 'general'),  'General');
  renderSidebar(getSidebarItems(_user.role_id, 'workflow'), 'Workflow');
  renderSidebar(getSidebarItems(_user.role_id, 'drive'),    'My Drive');

  revealAppShell();

  await _loadDonorSelector();
  _setupDonorSelector();
  _setupInterviewForm();
}

// ─── Donor Selector ───────────────────────────────────────────────────────────

async function _loadDonorSelector() {
  const select  = document.getElementById('donor-select');
  const errorEl = document.getElementById('donor-load-error');
  if (!select) return;

  try {
    // Load all donors — backend scopes to drive context for field roles
    // We use searchDonors with empty-like broad fetch via getAllDonors path
    // Actually: use the search endpoint with a space to get broad results,
    // or better — load the full list via the donors endpoint
    const res  = await fetch('/api/donors', { credentials: 'include' });
    const body = await res.json();

    if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load donors.');

    const donors = body.data;

    select.innerHTML = '<option value="">Select a donor...</option>';

    if (!donors || donors.length === 0) {
      select.innerHTML = '<option value="">No donors registered yet.</option>';
      return;
    }

    donors.forEach(donor => {
      const opt   = document.createElement('option');
      opt.value   = donor.donor_id;
      opt.textContent = `${donor.last_name}, ${donor.first_name}`;
      select.appendChild(opt);
    });

    // Pre-select donor from registration page if sessionStorage has one
    try {
      const storedId = sessionStorage.getItem('field_donor_id');
      if (storedId) {
        select.value = storedId;
        // Trigger change to load donor info
        select.dispatchEvent(new Event('change'));
      }
    } catch (_e) {
      // sessionStorage unavailable
    }
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || 'Failed to load donors. Please refresh the page.';
      _showEl(errorEl);
    }
    select.innerHTML = '<option value="">Failed to load donors</option>';
  }
}

function _setupDonorSelector() {
  const select = document.getElementById('donor-select');
  if (!select) return;
  select.addEventListener('change', _handleDonorChange);
}

async function _handleDonorChange() {
  const select   = document.getElementById('donor-select');
  const donorId  = select ? select.value : '';

  // Reset everything below
  _selectedDonor    = null;
  _createdInterview = null;
  _questions        = [];

  _hideEl(document.getElementById('donor-info-panel'));
  _hideEl(document.getElementById('interview-form-section'));
  _hideEl(document.getElementById('proceed-section'));
  _hideEl(document.getElementById('interview-already-done'));

  if (!donorId) return;

  try {
    const donor = await getDonorById(donorId);
    _selectedDonor = donor;
    _renderDonorInfo(donor);
    _showEl(document.getElementById('donor-info-panel'));

    // Check if donor already has an interview in this drive
    await _checkExistingInterview(donor);
  } catch (err) {
    showToast('Failed to load donor details. Please try again.', 'error');
  }
}

function _renderDonorInfo(donor) {
  const list = document.getElementById('donor-info-list');
  if (!list) return;

  list.innerHTML = '';

  const fields = [
    ['Name',       `${donor.first_name} ${donor.last_name}`],
    ['Birthdate',  donor.birthdate  || 'Not on record'],
    ['Sex',        donor.sex        || 'Not on record'],
    ['Blood Type', donor.blood_type || 'Unknown'],
    ['Email',      donor.email      || 'Not on record'],
    ['Contact',    donor.contact    || 'Not on record'],
  ];

  fields.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    list.appendChild(dt);
    list.appendChild(dd);
  });
}

// ─── Existing Interview Check ─────────────────────────────────────────────────

async function _checkExistingInterview(donor) {
  try {
    const interviews = await getInterviewsByDonor(donor.donor_id);

    // Check if there is already an interview for this donor
    // (backend scopes by drive — any result means this drive already has one)
    if (interviews && interviews.length > 0) {
      // Show already-done message, hide the form
      _showEl(document.getElementById('interview-form-section'));
      _showEl(document.getElementById('interview-already-done'));

      const submitSection = document.getElementById('interview-submit-section');
      if (submitSection) _hideEl(submitSection);

      const questionList = document.getElementById('question-list');
      if (questionList) questionList.innerHTML = '';

      // Store the existing interview for reference
      _createdInterview = interviews[interviews.length - 1];

      // Show proceed section directly
      _showEl(document.getElementById('proceed-section'));
      return;
    }

    // No existing interview — show the form and load questions
    await _initInterviewForm(donor);
  } catch (err) {
    showToast('Failed to check existing interviews. Please try again.', 'error');
  }
}

// ─── Interview Form ───────────────────────────────────────────────────────────

async function _initInterviewForm(donor) {
  const formSection = document.getElementById('interview-form-section');
  const submitSection = document.getElementById('interview-submit-section');
  _showEl(formSection);
  if (submitSection) _showEl(submitSection);

  // Load questions based on donor sex
  await _loadQuestions(donor.sex);
}

async function _loadQuestions(sex) {
  const list    = document.getElementById('question-list');
  const errorEl = document.getElementById('questions-load-error');
  if (!list) return;

  list.innerHTML = '<p class="search-status">Loading questions...</p>';

  try {
    const questions = await getQuestionsBySex(sex || 'Male');
    _questions = questions;
    list.innerHTML = '';

    if (!questions || questions.length === 0) {
      list.innerHTML = '<p class="search-status">No questions found for this donor.</p>';
      return;
    }

    questions.forEach((q, index) => {
      const item = document.createElement('div');
      item.className = 'question-item';

      const text = document.createElement('p');
      text.className   = 'question-text';
      text.textContent = `${index + 1}. ${q.question_text}`;

      const options = document.createElement('div');
      options.className = 'question-options';

      ['YES', 'NO'].forEach(val => {
        const label = document.createElement('label');
        label.className = 'question-option';

        const radio = document.createElement('input');
        radio.type  = 'radio';
        radio.name  = `question_${q.question_id}`;
        radio.value = val;
        radio.setAttribute('data-question-id', q.question_id);

        const span = document.createElement('span');
        span.textContent = val === 'YES' ? 'Yes' : 'No';

        label.appendChild(radio);
        label.appendChild(span);
        options.appendChild(label);
      });

      item.appendChild(text);
      item.appendChild(options);
      list.appendChild(item);
    });
  } catch (err) {
    list.innerHTML = '';
    if (errorEl) {
      errorEl.textContent = 'Failed to load interview questions. Please refresh and try again.';
      _showEl(errorEl);
    }
  }
}

function _setupInterviewForm() {
  const form = document.getElementById('interview-form');
  if (!form) return;
  form.addEventListener('submit', _handleInterviewSubmit);
}

async function _handleInterviewSubmit(e) {
  e.preventDefault();
  if (!_selectedDonor) return;

  const formError = document.getElementById('interview-form-error');
  if (formError) _hideEl(formError);

  // Step 1: Create the interview record
  const submitBtn = document.getElementById('interview-submit-btn');

  if (submitBtn) {
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    // Create interview first
    const interviewData = {
      donor_id:  _selectedDonor.donor_id,
      branch_id: _user.branch_id,
    };

    const { valid: ivValid, errors: ivErrors } = validateInterview(interviewData);
    if (!ivValid) {
      const errEl = document.getElementById('donor-select-error');
      if (errEl) {
        errEl.textContent = ivErrors.donor_id || 'Select a donor to continue.';
        errEl.classList.remove('field-error-hidden');
      }
      return;
    }

    const interview = await createInterview(interviewData);
    _createdInterview = interview;

    // Step 2: Collect answers
    const answers = _collectAnswers();

    const { valid: ansValid, errors: ansErrors } = validateAnswers(answers);
    if (!ansValid) {
      if (formError) {
        formError.textContent = 'Please answer all questions before submitting.';
        _showEl(formError);
      }
      // Delete the interview we just created? No — backend handles this.
      // Just show the error and let staff fix it.
      return;
    }

    // Step 3: Submit answers
    await submitAnswers({
      interview_id: interview.interview_id,
      donor_id:     _selectedDonor.donor_id,
      answers,
    });

    // Clear the sessionStorage donor hint so next page starts fresh
    try {
      sessionStorage.removeItem('field_donor_id');
      sessionStorage.removeItem('field_donor_name');
    } catch (_e) { /* ignore */ }

    showToast('Interview submitted successfully.', 'success');
    _showEl(document.getElementById('proceed-section'));
    _hideEl(document.getElementById('interview-submit-section'));

    // Store interview_id for screening page
    try {
      sessionStorage.setItem('field_interview_id',  interview.interview_id);
      sessionStorage.setItem('field_interview_donor_id', _selectedDonor.donor_id);
    } catch (_e) { /* ignore */ }

  } catch (err) {
    const msg = err.message || 'Failed to submit interview. Please try again.';

    // 403 means no active drive assignment
    if (err.status === 403) {
      if (formError) {
        formError.textContent = 'You are not assigned to an active blood drive. Please contact your coordinator.';
        _showEl(formError);
      }
    } else {
      if (formError) {
        formError.textContent = msg;
        _showEl(formError);
      }
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Submit Interview';
    }
  }
}

function _collectAnswers() {
  const answers = [];
  _questions.forEach(q => {
    const selected = document.querySelector(
      `input[name="question_${q.question_id}"]:checked`
    );
    answers.push({
      question_id: q.question_id,
      answer:      selected ? selected.value : '',
    });
  });
  return answers;
}

// ─── DOM Helpers ──────────────────────────────────────────────────────────────

function _showEl(el) {
  if (el) el.style.display = '';
}

function _hideEl(el) {
  if (el) el.style.display = 'none';
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

init();