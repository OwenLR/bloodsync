import { requireAuth }       from '../../core/guards/authGuard.js';
import { requireRole }        from '../../core/guards/roleGuard.js';
import { renderNavbar }       from '../../layouts/navbar.js';
import { renderSidebar,
         clearSidebar }       from '../../layouts/sidebar.js';
import { revealAppShell }     from '../../layouts/appShell.js';
import { refreshBadge } from '../../features/notifications/notificationsUI.js';
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
let _createdInterview = null;
let _questions        = [];
let _dropdown         = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string or YYYY-MM-DD to YYYY-MM-DD display string.
 * FIX Issue 3: prevents raw ISO strings like "1990-05-15T00:00:00.000Z"
 * from appearing in the dropdown and donor info panel.
 */
function _formatBirthdate(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  _user = await requireAuth();
  if (!_user) return;

  if (!requireRole(_user, [ROLES.VOLUNTEER, ROLES.PHLEBOTOMIST, ROLES.PRC_STAFF])) return;

  renderNavbar(_user, 0);
  clearSidebar();

  // FIX: branch sidebar by role — was always rendering field role sidebar
  const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;
  if (isFieldRole) {
    renderSidebar(getSidebarItems(_user.role_id, 'general'),  'General');
    renderSidebar(getSidebarItems(_user.role_id, 'workflow'), 'Workflow');
    renderSidebar(getSidebarItems(_user.role_id, 'drive'),    'My Drive');
  } else {
    renderSidebar(getSidebarItems(_user.role_id, 'general'),    'General');
    renderSidebar(getSidebarItems(_user.role_id, 'management'), 'Management');
  }

  revealAppShell();

  refreshBadge(); // non-blocking, sets navbar badge to the real unread count

  await _initDonorDropdown();
  _setupInterviewForm();
}

// ─── Donor Selector ───────────────────────────────────────────────────────────

async function _initDonorDropdown() {
  const errorEl = document.getElementById('donor-load-error');

  try {
    const [allDonors, allInterviews] = await Promise.all([
      getAllDonors(),
      getAllInterviews(),
    ]);

    const isFieldRole = _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;

    let eligibleDonors;
    if (isFieldRole) {
      // Issue 5: exclude donors with a completed interview from the dropdown.
      // A completed interview with interview_result = 'Deferred' means the donor
      // is blocked for this drive entirely — exclude them too (they'd hit the
      // already-done path and show a deferred notice anyway, but cleaner to omit).
      const completedInterviewDonorIds = new Set(
        allInterviews
          .filter(iv => iv.interview_result !== null)
          .map(iv => iv.donor_id)
      );
      eligibleDonors = allDonors.filter(d => !completedInterviewDonorIds.has(d.donor_id));
    } else {
      // Admin/Staff walk-in: show all donors. Deferred donors can still be selected
      // and the existing interview check will show the appropriate state.
      eligibleDonors = allDonors;
    }

    _dropdown = initSearchableDropdown({
      inputId:      'donor-select-input',
      listId:       'donor-select-list',
      items:         eligibleDonors,
      displayFn:    (d) => `${d.last_name}, ${d.first_name}`,
      // FIX Issue 3: format birthdate as YYYY-MM-DD in dropdown sub-line
      subDisplayFn: (d) => [d.blood_type, d.sex, _formatBirthdate(d.birthdate)].filter(Boolean).join(' · '),
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

    // Pre-select donor passed from registration page
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
  _selectedDonor    = null;
  _createdInterview = null;
  _questions        = [];

  _hideEl(document.getElementById('donor-info-panel'));
  _hideEl(document.getElementById('interview-form-section'));
  _hideEl(document.getElementById('proceed-section'));
  _hideEl(document.getElementById('interview-already-done'));
  _hideEl(document.getElementById('interview-deferred-notice'));

  try {
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
    // FIX Issue 3: format birthdate in donor info panel
    ['Birthdate',  _formatBirthdate(donor.birthdate) || 'Not on record'],
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

/**
 * Set the "already has a completed interview" message text.
 * HTML leaves this element's text empty on purpose — wording depends on
 * role, so it's set here rather than hardcoded in donorInterview.html
 * (which is shared by Staff and Volunteer/Phlebotomist).
 */
function _setAlreadyDoneMessage() {
  const el = document.getElementById('interview-already-done');
  if (!el) return;
  el.textContent = _isFieldRole()
    ? 'This donor already has a completed interview for this drive. Proceed to the screening step.'
    : 'This donor already has a completed interview. Proceed to the screening step.';
}

async function _checkExistingInterview(donor) {
  try {
    const interviews = await getInterviewsByDonor(donor.donor_id);

    if (interviews && interviews.length > 0) {
      const pendingInterview    = interviews.find(iv => iv.interview_result === null);
      const completedInterview  = interviews.find(iv => iv.interview_result !== null);

      if (pendingInterview) {
        _createdInterview = pendingInterview;
        await _initInterviewForm(donor);
        return;
      }

      if (completedInterview) {
        _createdInterview = completedInterview;

        // FIX Issue 4: check if this completed interview resulted in deferral
        const isDeferred = _isDeferredResult(completedInterview.interview_result);

        if (isDeferred) {
          // Show deferral notice — donor cannot proceed in this drive
          _showEl(document.getElementById('interview-form-section'));
          _setAlreadyDoneMessage();
          _showEl(document.getElementById('interview-already-done'));
          _hideEl(document.getElementById('interview-submit-section'));
          document.getElementById('question-list') && (document.getElementById('question-list').innerHTML = '');

          _renderDeferralNotice(completedInterview, 'interview');
          _showEl(document.getElementById('interview-deferred-notice'));
          // Do NOT show proceed-section — donor is blocked
          return;
        }

        // Passed interview — show already-done state with proceed
        try {
          sessionStorage.setItem('field_interview_id', _createdInterview.interview_id);
          sessionStorage.setItem('field_interview_donor_id', donor.donor_id);
        } catch (_e) { /* ignore */ }

        _showEl(document.getElementById('interview-form-section'));
        _setAlreadyDoneMessage();
        _showEl(document.getElementById('interview-already-done'));

        const submitSection = document.getElementById('interview-submit-section');
        if (submitSection) _hideEl(submitSection);

        const questionList = document.getElementById('question-list');
        if (questionList) questionList.innerHTML = '';

        _showEl(document.getElementById('proceed-section'));
        return;
      }
    }

    await _initInterviewForm(donor);
  } catch (err) {
    showToast('Failed to check existing interviews. Please try again.', 'error');
  }
}

/**
 * Determine if an interview result string means the donor was deferred.
 * The backend may store this as 'Deferred', 'Failed', or similar.
 * We treat anything that is NOT a passed/eligible value as deferred.
 */
/**
 * Staff walk-ins have no blood drive context at all (drive_id is always
 * null for them) — messaging that references "this blood drive" is
 * misleading/confusing for Staff. Volunteer/Phlebotomist are always
 * acting within a real, active drive, so the drive-specific wording
 * stays accurate for them.
 */
function _isFieldRole() {
  return _user.role_id === ROLES.VOLUNTEER || _user.role_id === ROLES.PHLEBOTOMIST;
}

function _isDeferredResult(result) {
  if (!result) return false;
  const normalized = String(result).toLowerCase();
  // Passed values — anything else is deferred/blocked
  return normalized === 'deferred' || normalized === 'failed';
}

/**
 * Render the deferral notice with which step and what date.
 * FIX Issue 5 partial: show date as YYYY-MM-DD only (no time).
 */
function _renderDeferralNotice(record, step) {
  const notice = document.getElementById('interview-deferred-notice');
  if (!notice) return;

  // Format the date — prefer created_at, fall back to deferred_at
  const rawDate = record.deferred_at || record.created_at || record.updated_at;
  const dateStr = rawDate ? String(rawDate).slice(0, 10) : 'unknown date';

  const stepLabel = step === 'interview' ? 'the donor interview' : step;

  notice.innerHTML = '';

  const icon = document.createElement('span');
  icon.textContent = '⚠';
  icon.setAttribute('aria-hidden', 'true');
  icon.style.marginRight = '6px';

  const msg = document.createElement('span');
  const scopeText = _isFieldRole()
    ? 'They cannot participate in this blood drive.'
    : 'They cannot donate at this time.';
  msg.textContent =
    `This donor was deferred during ${stepLabel} on ${dateStr}. ` +
    `${scopeText} Please register a different donor.`;

  notice.appendChild(icon);
  notice.appendChild(msg);
}

// ─── Interview Form ───────────────────────────────────────────────────────────

async function _initInterviewForm(donor) {
  const formSection   = document.getElementById('interview-form-section');
  const submitSection = document.getElementById('interview-submit-section');
  _showEl(formSection);
  if (submitSection) _showEl(submitSection);

  await _loadQuestions(donor.sex);
}

async function _loadQuestions(sex) {
  const list    = document.getElementById('question-list');
  const errorEl = document.getElementById('questions-load-error');
  if (!list) return;

  list.innerHTML = '<p class="search-status">Loading questions...</p>';

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
        // Store whether this answer would defer the donor
        if (q.defer_if) {
          radio.setAttribute('data-defer-if', q.defer_if);
        }

        const span = document.createElement('span');
        span.textContent = val === 'YES' ? 'Yes' : 'No';

        // FIX Issue 4: live inline warning when a deferring answer is selected
        radio.addEventListener('change', () => {
          _updateDeferWarning(q, val);
        });

        label.appendChild(radio);
        label.appendChild(span);
        options.appendChild(label);
      });

      // Per-question inline defer warning element
      const deferWarn = document.createElement('p');
      deferWarn.className = 'question-defer-warning field-error-hidden';
      deferWarn.id        = `defer-warn-${q.question_id}`;
      deferWarn.textContent = _isFieldRole()
        ? 'Answering this way will defer this donor from the blood drive.'
        : 'Answering this way will defer this donor.';
      deferWarn.setAttribute('aria-live', 'polite');

      item.appendChild(text);
      item.appendChild(options);
      item.appendChild(deferWarn);
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

/**
 * FIX Issue 4: Show an inline warning beneath a question when the selected
 * answer matches the defer_if value for that question.
 */
function _updateDeferWarning(question, selectedValue) {
  const warnEl = document.getElementById(`defer-warn-${question.question_id}`);
  if (!warnEl) return;

  if (question.defer_if && selectedValue === question.defer_if) {
    warnEl.classList.remove('field-error-hidden');
  } else {
    warnEl.classList.add('field-error-hidden');
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

    // Step 4: FIX Issue 4 — check if submission resulted in deferral
    // Re-fetch the interview record to get the updated interview_result.
    // submitAnswers response does not include deferral info directly.
    let isDeferred = false;
    try {
      const updatedInterviews = await getInterviewsByDonor(_selectedDonor.donor_id);
      const thisInterview     = updatedInterviews.find(iv => iv.interview_id === interview.interview_id);
      if (thisInterview && _isDeferredResult(thisInterview.interview_result)) {
        isDeferred = true;
        _createdInterview = thisInterview;
      }
    } catch (_e) {
      // If re-fetch fails, fall through — we still submitted successfully
    }

    // Clear registration sessionStorage hint
    try {
      sessionStorage.removeItem('field_donor_id');
      sessionStorage.removeItem('field_donor_name');
    } catch (_e) { /* ignore */ }

    if (isDeferred) {
      // FIX Issue 4: show deferral result — do NOT show proceed to screening
      showToast('Interview submitted. This donor has been deferred.', 'warning');
      _hideEl(document.getElementById('interview-submit-section'));

      _renderDeferralNotice(_createdInterview, 'the donor interview');
      _showEl(document.getElementById('interview-deferred-notice'));
      // proceed-section stays hidden — donor cannot go to screening
    } else {
      // Passed — store interview for screening page and show proceed
      showToast('Interview submitted successfully.', 'success');
      _hideEl(document.getElementById('interview-submit-section'));
      _showEl(document.getElementById('proceed-section'));

      try {
        sessionStorage.setItem('field_interview_id',       interview.interview_id);
        sessionStorage.setItem('field_interview_donor_id', _selectedDonor.donor_id);
      } catch (_e) { /* ignore */ }
    }

  } catch (err) {
    const msg = err.message || 'Failed to submit interview. Please try again.';
    if (formError) {
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