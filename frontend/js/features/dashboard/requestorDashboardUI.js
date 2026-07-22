/**
 * requestorDashboardUI.js — Requestor Dashboard.
 *
 * Public-facing register — most of this page is static/motivational
 * content that renders immediately in initRequestorDashboard(), not
 * gated behind a network call. Only the "Active Request" card depends
 * on data, so only that section gets its own scoped skeleton/error
 * state — the hero, mission blurb, availability teaser, and quick
 * links never wait on the network.
 *
 * Data source: bloodRequestApi.js's getMyRequests() — reused directly,
 * same "feature-to-feature API reuse" pattern as the Admin/Staff
 * dashboards. No new backend endpoint needed.
 *
 * ASSUMPTION FLAG: importing from '../bloodRequests/bloodRequestApi.js'
 * based on sessionState.md's note that this file "gained getMyRequests(),
 * cancelRequest(), markReceived()" — the file itself wasn't uploaded
 * this session. If the actual path/filename differs, fix this import.
 */

import { getMyRequests } from '../bloodRequests/bloodRequestApi.js';
import { ROUTES } from '../../constants/routes.js';

// Matches contract.md's VALID_TRANSITIONS chain. Rejected/Cancelled are
// terminal-but-not-on-the-happy-path, so they're handled separately
// below rather than plotted on this stepper.
const STEPS = ['Pending', 'Approved', 'Waiting', 'Released'];

const DONATION_FACTS = [
  'A single donation can help save up to three lives.',
  'Blood cannot be manufactured, it only comes from generous donors like you.',
  'Someone needs blood every few minutes, for surgeries, childbirth, and emergencies alike.',
  'Every blood type is needed, there is no such thing as a type that "doesn\u2019t matter."',
  'A steady blood supply depends on requests like yours being met by willing donors.',
];

export async function initRequestorDashboard() {
  renderHero();
  renderMissionBlurb();
  renderAvailabilityTeaser();
  renderQuickLinks();
  loadActiveRequest(); // scoped, non-blocking — see file header
}

// ── Hero ──────────────────────────────────────────────────────────────

function renderHero() {
  const container = document.getElementById('dashboard-hero');
  container.textContent = '';

  const motto = document.createElement('p');
  motto.className = 'hero-motto';
  motto.textContent = 'Every request matters. Every donor makes it possible.';

  const sub = document.createElement('p');
  sub.className = 'hero-subtext';
  sub.textContent = "Submit a blood request and we'll connect you with the nearest available supply.";

  const cta = document.createElement('a');
  cta.className = 'hero-cta';
  cta.href = ROUTES.REQUESTOR.SUBMIT_REQUEST;
  cta.textContent = 'Submit a Request';

  container.appendChild(motto);
  container.appendChild(sub);
  container.appendChild(cta);
}

// ── Active request status ───────────────────────────────────────────

async function loadActiveRequest() {
  const container = document.getElementById('active-request-card');
  showCardSkeleton(container);

  try {
    const requests = await getMyRequests();
    const active = requests
      .filter(r => ['Pending', 'Approved', 'Waiting'].includes(r.status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!active) {
      renderNoActiveRequest(container);
      return;
    }
    renderActiveRequest(container, active);
  } catch (err) {
    renderCardError(container);
  }
}

function showCardSkeleton(container) {
  container.textContent = '';
  const skel = document.createElement('div');
  skel.className = 'skeleton-item';
  skel.innerHTML =
    '<div class="skeleton-line skeleton-line-wide"></div>' +
    '<div class="skeleton-line skeleton-line-narrow"></div>';
  container.appendChild(skel);
}

function renderNoActiveRequest(container) {
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'card-heading';
  heading.textContent = 'No Active Request';

  const msg = document.createElement('p');
  msg.className = 'card-subtext';
  msg.textContent = "You don't have a request in progress right now.";

  const link = document.createElement('a');
  link.className = 'btn-secondary';
  link.href = ROUTES.REQUESTOR.SUBMIT_REQUEST;
  link.textContent = 'Submit a Request';

  container.appendChild(heading);
  container.appendChild(msg);
  container.appendChild(link);
}

function renderCardError(container) {
  container.textContent = '';

  const msg = document.createElement('p');
  msg.textContent = "We couldn't load your request status. Please try again.";

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn-retry';
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', loadActiveRequest);

  container.appendChild(msg);
  container.appendChild(retryBtn);
}

function renderActiveRequest(container, request) {
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'card-heading';
  heading.textContent = `Request at ${request.branch_name}`;
  container.appendChild(heading);

  // Terminal-but-not-happy-path statuses don't fit the 4-step stepper —
  // shouldn't normally reach here since loadActiveRequest() only selects
  // Pending/Approved/Waiting, but guarding anyway in case that filter
  // ever changes.
  if (request.status === 'Rejected' || request.status === 'Cancelled') {
    const msg = document.createElement('p');
    msg.className = 'card-subtext';
    msg.textContent = `This request was ${request.status.toLowerCase()}.`;
    container.appendChild(msg);
  } else {
    container.appendChild(renderStepper(request.status));
  }

  const link = document.createElement('a');
  link.className = 'btn-secondary';
  link.href = ROUTES.REQUESTOR.REQUESTS;
  link.textContent = 'View My Requests';
  container.appendChild(link);
}

function renderStepper(currentStatus) {
  const stepper = document.createElement('div');
  stepper.className = 'request-stepper';

  const currentIndex = STEPS.indexOf(currentStatus);

  STEPS.forEach((step, i) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'request-stepper-step';
    if (i < currentIndex) stepEl.classList.add('request-stepper-step--done');
    if (i === currentIndex) stepEl.classList.add('request-stepper-step--active');

    const dot = document.createElement('span');
    dot.className = 'request-stepper-dot';

    const label = document.createElement('span');
    label.className = 'request-stepper-label';
    label.textContent = step;

    stepEl.appendChild(dot);
    stepEl.appendChild(label);
    stepper.appendChild(stepEl);
  });

  return stepper;
}

// ── Mission blurb + rotating fact ───────────────────────────────────

function renderMissionBlurb() {
  const container = document.getElementById('mission-blurb');
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'card-heading';
  heading.textContent = 'Did You Know?';

  const fact = document.createElement('p');
  fact.className = 'donation-fact';

  container.appendChild(heading);
  container.appendChild(fact);

  let index = 0;
  fact.textContent = DONATION_FACTS[index];
  setInterval(() => {
    index = (index + 1) % DONATION_FACTS.length;
    fact.textContent = DONATION_FACTS[index];
  }, 8000);
}

// ── Availability teaser ─────────────────────────────────────────────

function renderAvailabilityTeaser() {
  const container = document.getElementById('availability-teaser');
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'card-heading';
  heading.textContent = 'Check Blood Availability';

  const msg = document.createElement('p');
  msg.className = 'card-subtext';
  msg.textContent = 'See which blood types and components are available near you before submitting a request.';

  const link = document.createElement('a');
  link.className = 'btn-secondary';
  link.href = ROUTES.REQUESTOR.AVAILABILITY;
  link.textContent = 'Check Availability';

  container.appendChild(heading);
  container.appendChild(msg);
  container.appendChild(link);
}

// ── Quick links ──────────────────────────────────────────────────────

function renderQuickLinks() {
  const container = document.getElementById('quick-actions');
  container.textContent = '';

  const heading = document.createElement('h2');
  heading.className = 'quick-actions-heading';
  heading.textContent = 'Quick Links';
  container.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'quick-actions-list';

  const actions = [
    { label: 'Submit Request',     href: ROUTES.REQUESTOR.SUBMIT_REQUEST },
    { label: 'My Requests',        href: ROUTES.REQUESTOR.REQUESTS },
    { label: 'Blood Availability', href: ROUTES.REQUESTOR.AVAILABILITY },
  ];

  actions.forEach(a => {
    const link = document.createElement('a');
    link.href = a.href;
    link.className = 'btn-secondary';
    link.textContent = a.label;
    list.appendChild(link);
  });

  container.appendChild(list);
}