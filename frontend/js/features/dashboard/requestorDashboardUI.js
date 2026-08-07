/**
 * requestorDashboardUI.js — Requestor Dashboard.
 *
 * Public-facing register — this is the first page a stranger sees,
 * often either stressed (needing blood for someone) or sizing up
 * whether to trust a nonprofit with their data. Most of this page is
 * static/motivational content that renders immediately in
 * initRequestorDashboard(), not gated behind a network call. Only the
 * status panel depends on data, so only that section gets its own
 * scoped skeleton/error state — the hero and trust strip never wait on
 * the network.
 *
 * Data source: bloodRequestApi.js's getMyRequests() — reused directly,
 * same "feature-to-feature API reuse" pattern as the Admin/Staff
 * dashboards. No new backend endpoint needed.
 *
 * ASSUMPTION FLAG: importing from '../bloodRequests/bloodRequestApi.js'
 * based on sessionState.md's note that this file "gained getMyRequests(),
 * cancelRequest(), markReceived()" — the file itself wasn't uploaded
 * this session. If the actual path/filename differs, fix this import.
 *
 * REDESIGN NOTE (this pass, v2): removed the redundant CTAs that all
 * pointed at the same route (hero button + empty-state "Submit a
 * Request" button + "Check Availability" tile, which had nowhere else
 * to send people since there's no standalone availability-browsing
 * feature per contract.md). Now there is exactly ONE prominent action
 * (the hero CTA). The status panel's empty state teaches the visitor
 * what happens next instead of repeating the button; the old "Did You
 * Know" + "Check Availability" cards are merged into a trust strip that
 * speaks to legitimacy/confidentiality instead. The Quick Actions tile
 * grid is removed entirely — see dashboard.html's ASSUMPTION FLAG on
 * why (sidebar nav presumed to already cover those links).
 *
 * All icon markup is static, hardcoded SVG — never built from API or
 * user data, so innerHTML use for it doesn't conflict with the "never
 * innerHTML with API data" rule (same reasoning as this file's
 * pre-existing skeleton markup).
 */

import { getMyRequests } from '../bloodRequests/bloodRequestApi.js';
import { ROUTES } from '../../constants/routes.js';

// Matches contract.md's VALID_TRANSITIONS chain. Rejected/Cancelled are
// terminal-but-not-on-the-happy-path, so they're handled separately
// below rather than plotted on this stepper.
const STEPS = ['Pending', 'Approved', 'Waiting', 'Released'];

// Icon shown inside each stepper dot, keyed by status label.
const STEP_ICONS = {
  Pending:  'clock',
  Approved: 'checkCircle',
  Waiting:  'package',
  Released: 'giftHeart',
};

const HOW_IT_WORKS_STEPS = [
  {
    title: 'Tell us what you need',
    desc: 'Blood type, component, and how many units — plus your hospital and the request form.',
    iconName: 'fileText',
  },
  {
    title: 'PRC Batangas reviews it',
    desc: 'Staff check the form and match you to the nearest branch with available supply.',
    iconName: 'shieldCheck',
  },
  {
    title: 'Pick up or get matched blood',
    desc: 'You\u2019ll be notified at every step, from approval to when it\u2019s ready.',
    iconName: 'giftHeart',
  },
];

const DONATION_FACTS = [
  'A single donation can help save up to three lives.',
  'Blood cannot be manufactured, it only comes from generous donors like you.',
  'Someone needs blood every few minutes, for surgeries, childbirth, and emergencies alike.',
  'Every blood type is needed, there is no such thing as a type that "doesn\u2019t matter."',
  'A steady blood supply depends on requests like yours being met by willing donors.',
];

// ── Icon helper ──────────────────────────────────────────────────────
// All static, hand-authored SVGs — themeable via CSS `color` (currentColor).
// Kept local to this file since it's the only page using them so far.

const ICON_SVGS = {
  droplet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5s7 7.6 7 12.5a7 7 0 1 1-14 0c0-4.9 7-12.5 7-12.5Z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.3 2.3L16 10"/></svg>',
  package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  giftHeart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M3 13h18M12 9v12"/><path d="M12 9c-1.7-3-6-4.3-6-1 0 1.6 2.6 1 6 1Zm0 0c1.7-3 6-4.3 6-1 0 1.6-2.6 1-6 1Z"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  shieldCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.17 6C4.86 7.9 3.5 10.3 3.5 13.1c0 2.6 1.5 4.4 3.6 4.4 1.9 0 3.3-1.4 3.3-3.2 0-1.7-1.2-3-2.8-3-.3 0-.6 0-.8.1.3-2 1.9-3.7 3.7-4.7L7.17 6Zm9.6 0c-2.3 1.9-3.7 4.3-3.7 7.1 0 2.6 1.5 4.4 3.6 4.4 1.9 0 3.3-1.4 3.3-3.2 0-1.7-1.2-3-2.8-3-.3 0-.6 0-.8.1.3-2 1.9-3.7 3.7-4.7L16.77 6Z"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>',
  fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
  mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
};

function icon(name, extraClass) {
  const span = document.createElement('span');
  span.className = extraClass ? `dash-icon ${extraClass}` : 'dash-icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = ICON_SVGS[name] || '';
  return span;
}

// ── Scroll reveal ────────────────────────────────────────────────────
// Purely presentational: fades/rises an element into place the first
// time it scrolls into the viewport, so below-the-fold sections appear
// one at a time as the visitor scrolls instead of all at once on load.
// The hero is deliberately excluded — it's above the fold and keeps its
// own immediate .db-hero/.hero-content entrance from dashboard.css.
// One shared observer for the whole page; each element unobserves
// itself once revealed (one-shot, matches a landing-page feel rather
// than re-animating on scroll-up).

let revealObserver = null; // null = not yet initialized, false = unsupported

function getRevealObserver() {
  if (revealObserver !== null) return revealObserver;
  if (!('IntersectionObserver' in window)) {
    revealObserver = false;
    return revealObserver;
  }
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  return revealObserver;
}

// delayMs staggers siblings in a group (trust items, how-it-works
// steps) so they appear one after another rather than simultaneously.
// Falls back to showing the element immediately when
// IntersectionObserver isn't available, so nothing is ever stuck
// invisible on an old browser.
function reveal(el, delayMs = 0) {
  el.classList.add('reveal');
  if (delayMs) el.style.setProperty('--reveal-delay', `${delayMs}ms`);
  const observer = getRevealObserver();
  if (observer) {
    observer.observe(el);
  } else {
    el.classList.add('is-visible');
  }
  return el;
}

export async function initRequestorDashboard() {
  renderHero();
  renderTrustStrip();
  loadStatusPanel(); // scoped, non-blocking — see file header
}

// ── Hero ──────────────────────────────────────────────────────────────

function renderHero() {
  const container = document.getElementById('dashboard-hero');
  container.textContent = '';

  const content = document.createElement('div');
  content.className = 'hero-content';

  const badge = document.createElement('div');
  badge.className = 'hero-badge';
  // See requestor-dashboard.css's .hero-badge-icon comment — swap this
  // span for an <img> of a real PRC seal/logo if one becomes available.
  badge.appendChild(icon('shieldCheck', 'hero-badge-icon'));
  const badgeText = document.createElement('span');
  badgeText.textContent = 'Philippine Red Cross \u00b7 Batangas Chapter';
  badge.appendChild(badgeText);

  const motto = document.createElement('p');
  motto.className = 'hero-motto';
  motto.textContent = 'Every request matters. Every donor makes it possible.';

  const sub = document.createElement('p');
  sub.className = 'hero-subtext';
  sub.textContent = "Submit a blood request and we'll connect you with the nearest available supply.";

  const cta = document.createElement('a');
  cta.className = 'hero-cta';
  cta.href = ROUTES.REQUESTOR.SUBMIT_REQUEST;
  const ctaLabel = document.createElement('span');
  ctaLabel.textContent = 'Submit a Request';
  cta.appendChild(ctaLabel);
  cta.appendChild(icon('arrowRight', 'hero-cta-icon'));

  const trustNote = document.createElement('p');
  trustNote.className = 'hero-trust-note';
  trustNote.appendChild(icon('lock'));
  const trustText = document.createElement('span');
  trustText.textContent = 'Reviewed only by verified PRC staff \u2014 kept confidential.';
  trustNote.appendChild(trustText);

  content.appendChild(badge);
  content.appendChild(motto);
  content.appendChild(sub);
  content.appendChild(cta);
  content.appendChild(trustNote);

  container.appendChild(content);

  // Scroll cue — signals there's more below the fold and gives a
  // one-click way down, rather than relying on the visitor to guess
  // they should scroll. Not a .reveal element itself (it's inside the
  // hero, which is already visible on load).
  const scrollCue = document.createElement('button');
  scrollCue.type = 'button';
  scrollCue.className = 'hero-scroll-cue';
  scrollCue.setAttribute('aria-label', 'Scroll to learn more');
  scrollCue.appendChild(icon('chevronDown', 'hero-scroll-cue-icon'));
  const cueLabel = document.createElement('span');
  cueLabel.className = 'hero-scroll-cue-label';
  cueLabel.textContent = 'Scroll';
  scrollCue.appendChild(cueLabel);
  scrollCue.addEventListener('click', () => {
    document.getElementById('status-panel')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  container.appendChild(scrollCue);
}

// ── Status panel: active request stepper, or how-it-works ──────────

async function loadStatusPanel() {
  const container = document.getElementById('status-panel');
  showStatusSkeleton(container);

  try {
    const requests = await getMyRequests();
    const active = requests
      .filter(r => ['Pending', 'Approved', 'Waiting'].includes(r.status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!active) {
      renderHowItWorks(container);
      return;
    }
    renderActiveStatus(container, active);
  } catch (err) {
    renderStatusError(container);
  }
}

function showStatusSkeleton(container) {
  container.textContent = '';
  const card = document.createElement('div');
  card.className = 'status-card';
  card.innerHTML =
    '<div class="skeleton-item">' +
    '<div class="skeleton-line skeleton-line-wide"></div>' +
    '<div class="skeleton-line skeleton-line-medium"></div>' +
    '<div class="skeleton-line skeleton-line-narrow"></div>' +
    '</div>';
  container.appendChild(card);
}

function renderStatusError(container) {
  container.textContent = '';

  const card = document.createElement('div');
  card.className = 'status-card';

  card.appendChild(icon('alert', 'status-icon-lg'));

  const msg = document.createElement('p');
  msg.className = 'status-card-subtext';
  msg.textContent = "We couldn't load your request status. Please try again.";

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn-retry';
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', loadStatusPanel);

  card.appendChild(msg);
  card.appendChild(retryBtn);
  container.appendChild(card);
  reveal(card);
}

function renderActiveStatus(container, request) {
  container.textContent = '';

  const card = document.createElement('div');
  card.className = 'status-card';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'section-eyebrow';
  eyebrow.textContent = 'Your Status';
  card.appendChild(eyebrow);

  const headingRow = document.createElement('div');
  headingRow.className = 'status-card-heading-row';
  headingRow.appendChild(icon('droplet', 'status-card-icon'));

  const heading = document.createElement('h2');
  heading.className = 'status-card-title';
  heading.textContent = `Request at ${request.branch_name}`;
  headingRow.appendChild(heading);
  card.appendChild(headingRow);

  // Terminal-but-not-happy-path statuses don't fit the 4-step stepper —
  // shouldn't normally reach here since loadStatusPanel() only selects
  // Pending/Approved/Waiting, but guarding anyway in case that filter
  // ever changes.
  if (request.status === 'Rejected' || request.status === 'Cancelled') {
    const msg = document.createElement('p');
    msg.className = 'status-card-subtext';
    msg.textContent = `This request was ${request.status.toLowerCase()}.`;
    card.appendChild(msg);
  } else {
    card.appendChild(renderStepper(request.status));
  }

  const link = document.createElement('a');
  link.className = 'status-card-link';
  link.href = ROUTES.REQUESTOR.REQUESTS;
  const linkLabel = document.createElement('span');
  linkLabel.textContent = 'View My Requests';
  link.appendChild(linkLabel);
  link.appendChild(icon('arrowRight'));
  card.appendChild(link);

  container.appendChild(card);
  reveal(card);
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
    dot.appendChild(icon(STEP_ICONS[step]));

    const label = document.createElement('span');
    label.className = 'request-stepper-label';
    label.textContent = step;

    stepEl.appendChild(dot);
    stepEl.appendChild(label);
    stepper.appendChild(stepEl);
  });

  return stepper;
}

function renderHowItWorks(container) {
  container.textContent = '';

  const card = document.createElement('div');
  card.className = 'status-card';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'section-eyebrow';
  eyebrow.textContent = 'Get Started';
  card.appendChild(eyebrow);

  const headingRow = document.createElement('div');
  headingRow.className = 'status-card-heading-row';
  headingRow.appendChild(icon('shieldCheck', 'status-card-icon'));

  const heading = document.createElement('h2');
  heading.className = 'status-card-title';
  heading.textContent = 'How BloodSync Works';
  headingRow.appendChild(heading);
  card.appendChild(headingRow);

  const subtext = document.createElement('p');
  subtext.className = 'status-card-subtext';
  subtext.textContent = "You don't have a request in progress right now. Here's what happens once you submit one.";
  card.appendChild(subtext);

  const list = document.createElement('div');
  list.className = 'howitworks-list';

  HOW_IT_WORKS_STEPS.forEach((step, i) => {
    const stepEl = document.createElement('div');
    stepEl.className = 'howitworks-step';

    const num = document.createElement('span');
    num.className = 'howitworks-num';
    num.appendChild(icon(step.iconName));

    const textWrap = document.createElement('div');
    textWrap.className = 'howitworks-text';

    const title = document.createElement('p');
    title.className = 'howitworks-title';
    title.textContent = `${i + 1}. ${step.title}`;

    const desc = document.createElement('p');
    desc.className = 'howitworks-desc';
    desc.textContent = step.desc;

    textWrap.appendChild(title);
    textWrap.appendChild(desc);

    stepEl.appendChild(num);
    stepEl.appendChild(textWrap);
    list.appendChild(stepEl);

    // Staggered so steps visibly appear one after another rather than
    // all at once — offset past the card's own fade-in delay below.
    reveal(stepEl, 180 + i * 120);
  });

  card.appendChild(list);

  // Deliberately a plain text link, not a button — the hero above
  // already carries the one prominent CTA. This only helps someone who
  // scrolled straight past it.
  const link = document.createElement('a');
  link.className = 'howitworks-cta';
  link.href = ROUTES.REQUESTOR.SUBMIT_REQUEST;
  const linkLabel = document.createElement('span');
  linkLabel.textContent = 'Start your request';
  link.appendChild(linkLabel);
  link.appendChild(icon('arrowRight'));
  card.appendChild(link);

  container.appendChild(card);
  reveal(card);
}

// ── Trust strip ──────────────────────────────────────────────────────
// Replaces the old standalone "Did You Know" card and "Check Blood
// Availability" card (see this file's header note on why the latter
// was removed rather than relocated). Speaks to legitimacy and
// confidentiality — the two things a stranger sizes up before trusting
// a nonprofit with a request about someone they care about.

function renderTrustStrip() {
  const container = document.getElementById('trust-strip');
  container.textContent = '';
  // Full-bleed tinted band (like the hero) so this section reads as its
  // own distinct part of the page while scrolling, not just more of the
  // same column as the status panel above it.
  container.classList.add('trust-band');

  const intro = document.createElement('div');
  intro.className = 'section-intro-wrap';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'section-eyebrow';
  eyebrow.textContent = 'Why BloodSync';

  const heading = document.createElement('h2');
  heading.className = 'section-heading';
  heading.textContent = 'Built on trust, backed by the Red Cross';

  intro.appendChild(eyebrow);
  intro.appendChild(heading);
  container.appendChild(intro);
  reveal(intro);

  const strip = document.createElement('div');
  strip.className = 'trust-strip';

  const items = [
    buildTrustItem({
      iconName: 'shieldCheck',
      title: 'Verified & Confidential',
      text: 'Every request is reviewed by Philippine Red Cross staff before approval. Your information is never shared beyond what\u2019s needed to process it.',
    }),
    buildTrustItem({
      iconName: 'mapPin',
      title: '4 Branches Across Batangas',
      text: 'Serving Batangas City, Lipa, Nasugbu, and Tanauan \u2014 you\u2019ll be matched to whichever branch can help fastest.',
    }),
  ];

  const factItem = buildTrustItem({
    iconName: 'quote',
    title: 'Did You Know?',
    text: DONATION_FACTS[0],
  });
  items.push(factItem);

  items.forEach((item, i) => {
    strip.appendChild(item);
    // Staggered one after another as the strip scrolls into view.
    reveal(item, 120 + i * 130);
  });

  container.appendChild(strip);

  // Cross-fade the fact text in place. 300ms here must match the
  // transition duration on .trust-item-text in
  // pages/requestor/dashboard.css.
  const factText = factItem.querySelector('.trust-item-text');
  let index = 0;
  setInterval(() => {
    factText.classList.add('trust-fact--fading');
    setTimeout(() => {
      index = (index + 1) % DONATION_FACTS.length;
      factText.textContent = DONATION_FACTS[index];
      factText.classList.remove('trust-fact--fading');
    }, 300);
  }, 8000);
}

function buildTrustItem({ iconName, title, text }) {
  const item = document.createElement('div');
  item.className = 'trust-item';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'trust-item-icon';
  iconWrap.appendChild(icon(iconName));

  const titleEl = document.createElement('p');
  titleEl.className = 'trust-item-title';
  titleEl.textContent = title;

  const textEl = document.createElement('p');
  textEl.className = 'trust-item-text';
  textEl.textContent = text;

  item.appendChild(iconWrap);
  item.appendChild(titleEl);
  item.appendChild(textEl);

  return item;
}