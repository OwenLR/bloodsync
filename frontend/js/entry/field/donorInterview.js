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
  getAllDonors,
  getDonorById,
  getAllInterviews,
  getInterviewsByDonor,
  createInterview,
  getQuestionsBySex,
  submitAnswers,
} from '../../features/fieldWorkflow/fieldWorkflowApi.js';
import {
  validateInterview,
  validateAnswers,
} from '../../features/fieldWorkflow/fieldWorkflowValidation.js';
import { initSearchableDropdown } from '../../components/searchableDropdown.js';

// ─── State ────────────────────────────────────────────────────────────────────

let _user             = null;
let _selectedDonor    = null;
let _createdInterview = null;   // interview record after createInterview()
let _questions        = [];      // loaded questions for the selected donor's sex
let _dropdown         = null;    // searchableDropdown instance

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  _user = await requireAuth();
  if (!_user) return;

  if (!requireRole(_user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.ADMIN, ROLES.PRC_STAFF])) return;

  renderNavbar(_user, 0);
  clearSidebar();
  renderSidebar(getSidebarItems(_user.role_id, 'general'),  'General');
  renderSidebar(getSidebarItems(_user.role_id, 'workflow'), 'Workflow');
  renderSidebar(getSidebarItems(_user.role_id, 'drive'),    'My Drive');

  revealAppShell();

  await _initDonorDropdown();
  _setupInterviewForm();
}

// ─── Donor Selector (searchable dropdown) ────────────────────────────────────

async function _initDonorDropdown() {
  const errorEl = document.getElementById('donor-load-error');

  try {
    // Load all donors and existing interviews in parallel
    const [allDonors, allInterviews] = await Promise.all([
      getAllDonors(),
      getAllInterviews(),
    ]);

    // Determine eligible donors for the dropdown based on role:
    //
    // Field roles (Volunteer/Phlebotomist):
    //   The backend scopes GET /api/donor-interviews to their active drive.
    //   Build the set of donor_ids that already have an interview in this drive,
    //   then exclude them — leaving only donors registered here but not yet interviewed.
    //   Contract rule: "Interview page: show donors registered in this drive
    //   who have no interview yet."
    //
    // Admin/Staff (walk-in, drive_id = null):
    //   Show all donors unfiltered.
    //   Contract rule: "Admin/Staff walk-in: show all donors in the system unfiltered."
    const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;

    let eligibleDonors;
    if (isFieldRole) {
      const completedInterviewIds = new Set(
        allInterviews
          .filter(iv => iv.interview_result !== null)
          .map(iv => iv.donor_id)
      );
      eligibleDonors = allDonors.filter(d => !completedInterviewIds.has(d.donor_id));
    } else {
      eligibleDonors = allDonors;
    }

    _dropdown = initSearchableDropdown({
      inputId:      'donor-select-input',
      listId:       'donor-select-list',
      items:         eligibleDonors,
      displayFn:    (d) => `${d.last_name}, ${d.first_name}`,
      subDisplayFn: (d) => [d.blood_type, d.sex, d.birthdate].filter(Boolean).join(' · '),
      filterFn:     (d, q) =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        (d.id_number || '').toLowerCase().includes(q),
      onSelect:     _handleDonorSelected,
      placeholder:  isFieldRole
        ? 'Click to browse donors registered in this drive…'
        : 'Click to browse or type to filter donors…',
      emptyMessage: isFieldRole
        ? 'No donors available for interview. All registered donors may already have an interview, or none have been registered yet for this drive.'
        : 'No donors found matching your search.',
    });

    // Pre-select donor passed from registration page via sessionStorage
    try {
      const storedId = sessionStorage.getItem('field_donor_id');
      if (storedId) {
        _dropdown.selectByPredicate(d => String(d.donor_id) === String(storedId));
      }
    } catch (_e) { /* sessionStorage unavailable */ }

  } catch (err) {
    if (errorEl) {
      errorEl.textContent = err.message || 'Failed to load donors. Please refresh the page.';
      _showEl(errorEl);
    }
  }
}

async function _handleDonorSelected(donor) {
  // Reset everything below the selector
  _selectedDonor    = null;
  _createdInterview = null;
  _questions        = [];

  _hideEl(document.getElementById('donor-info-panel'));
  _hideEl(document.getElementById('interview-form-section'));
  _hideEl(document.getElementById('proceed-section'));
  _hideEl(document.getElementById('interview-already-done'));

  try {
    // Fetch full donor details — list may not include all fields (e.g. sex needed for questions)
    const fullDonor = await getDonorById(donor.donor_id);
    _selectedDonor  = fullDonor;
    _renderDonorInfo(fullDonor);
    _showEl(document.getElementById('donor-info-panel'));
    await _checkExistingInterview(fullDonor);
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

    if (interviews && interviews.length > 0) {
      // Prefer a pending interview session if one exists.
      const pendingInterview = interviews.find(iv => iv.interview_result === null);
      const completedInterview = interviews.find(iv => iv.interview_result !== null);

      if (pendingInterview) {
        _createdInterview = pendingInterview;
        await _initInterviewForm(donor);
        return;
      }

      if (completedInterview) {
        _createdInterview = completedInterview;

        // Store the completed interview so Screening can preselect this donor.
        try {
          sessionStorage.setItem('field_interview_id', _createdInterview.interview_id);
          sessionStorage.setItem('field_interview_donor_id', donor.donor_id);
        } catch (_e) { /* ignore */ }

        _showEl(document.getElementById('interview-form-section'));
        _showEl(document.getElementById('interview-already-done'));

        const submitSection = document.getElementById('interview-submit-section');
        if (submitSection) _hideEl(submitSection);

        const questionList = document.getElementById('question-list');
        if (questionList) questionList.innerHTML = '';

        _showEl(document.getElementById('proceed-section'));
        return;
      }
    }

    // No pending or completed interview — show the form and load questions
    await _initInterviewForm(donor);
  } catch (err) {
    showToast('Failed to check existing interviews. Please try again.', 'error');
  }
}

// ─── Interview Form ───────────────────────────────────────────────────────────

async function _initInterviewForm(donor) {
  const formSection   = document.getElementById('interview-form-section');
  const submitSection = document.getElementById('interview-submit-section');
  _showEl(formSection);
  if (submitSection) _showEl(submitSection);

  // Load questions based on donor sex.
  // getDonorById() is called before this so donor.sex should be populated.
  // Fall back to 'Male' if sex is missing — questions with sex_filter='Both' still load.
  await _loadQuestions(donor.sex);
}

async function _loadQuestions(sex) {
  const list    = document.getElementById('question-list');
  const errorEl = document.getElementById('questions-load-error');
  if (!list) return;

  list.innerHTML = '<p class="search-status">Loading questions...</p>';

  // Normalise sex value — backend expects exactly 'Male' or 'Female'
  const normalised = (sex || '').trim();
  const safeSex    = (normalised === 'Male' || normalised === 'Female') ? normalised : 'Male';

  try {
    const questions = await getQuestionsBySex(safeSex);
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
      errorEl.textContent = `Failed to load interview questions for ${safeSex} donors. Please refresh and try again.`;
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

  const submitBtn = document.getElementById('interview-submit-btn');
  if (submitBtn) {
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    // Step 1: Create or reuse the interview record
    let interview = _createdInterview;
    if (!interview || !interview.interview_id) {
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

      interview = await createInterview(interviewData);
      _createdInterview = interview;
    }

    // Step 2: Collect and validate answers
    const answers = _collectAnswers();

    const { valid: ansValid } = validateAnswers(answers);
    if (!ansValid) {
      if (formError) {
        formError.textContent = 'Please answer all questions before submitting.';
        _showEl(formError);
      }
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
      sessionStorage.setItem('field_interview_id',       interview.interview_id);
      sessionStorage.setItem('field_interview_donor_id', _selectedDonor.donor_id);
    } catch (_e) { /* ignore */ }

  } catch (err) {
    const msg = err.message || 'Failed to submit interview. Please try again.';
    if (formError) {
      // 403 means no active drive assignment for field roles
      formError.textContent = err.status === 403
        ? 'You are not assigned to an active blood drive. Please contact your coordinator.'
        : msg;
      _showEl(formError);
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