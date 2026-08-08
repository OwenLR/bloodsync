/**
 * requestorDashboardUI.js. Requestor Dashboard.
 *
 * Public-facing register. First page a stranger sees, often either
 * stressed (needing blood for someone) or sizing up whether to trust a
 * nonprofit with their data.
 *
 * REDESIGN NOTE (v4, editorial/magazine pass): the page is now a
 * sequence of full-width bands instead of a centered card column. Order:
 * masthead (always), status banner (only if there is an active request),
 * fact ticker (always), bento content grid (always), branch directory
 * (always). "How BloodSync Works" used to be shown only in the empty
 * state; it is now a permanent part of the content grid, since the goal
 * this pass is a page with no unused space rather than one that changes
 * shape based on request state.
 *
 * Data source: bloodRequestApi.js's getMyRequests(), reused directly,
 * same feature-to-feature API reuse pattern as the Admin/Staff
 * dashboards. Only the status banner depends on this call; the masthead,
 * ticker, content grid, and directory are static and render immediately.
 *
 * ASSUMPTION FLAG: importing from '../bloodRequests/bloodRequestApi.js'
 * based on sessionState.md's note that this file gained getMyRequests(),
 * cancelRequest(), and markReceived(). The file itself was not uploaded
 * this session. Fix this import if the actual path or filename differs.
 *
 * ASSUMPTION FLAG: the branch directory list (name only, no live counts)
 * is hardcoded, same as the previous pass's trust strip. Swapping this
 * for a live getBranches() call (bloodDrivesApi.js, already used by the
 * Submit Request fulfillment step) would be a reasonable follow-up, but
 * changes this page's "only the status section touches the network"
 * architecture, so it was left as-is rather than changed silently.
 *
 * All icon markup is static, hardcoded SVG, never built from API or
 * user data, so innerHTML use for it does not conflict with the "never
 * innerHTML with API data" rule.
 */

import { getMyRequests } from '../bloodRequests/bloodRequestApi.js';
import { ROUTES } from '../../constants/routes.js';

// Matches contract.md's VALID_TRANSITIONS chain. Rejected and Cancelled
// are terminal but not on the happy path, so they are handled separately
// rather than plotted on the stepper.
const STEPS = ['Pending', 'Approved', 'Waiting', 'Released'];

const STEP_ICONS = {
  Pending:  'clock',
  Approved: 'checkCircle',
  Waiting:  'package',
  Released: 'giftHeart',
};

const HOW_IT_WORKS_STEPS = [
  {
    title: 'Tell us what you need',
    desc: 'Blood type, component, and how many units, plus your hospital and the request form.',
  },
  {
    title: 'PRC Batangas reviews it',
    desc: 'Staff check the form and match you to the nearest branch with available supply.',
  },
  {
    title: 'Pick up or get matched blood',
    desc: 'You will be notified at every step, from approval to when it is ready.',
  },
];

const BRANCHES = [
  { name: 'Batangas City (Main)', sub: 'Head chapter office' },
  { name: 'Lipa',                 sub: 'Lipa City branch' },
  { name: 'Nasugbu',              sub: 'Nasugbu branch' },
  { name: 'Tanauan',              sub: 'Tanauan City branch' },
];

const DONATION_FACTS = [
  'A single donation can help save up to three lives.',
  'Blood cannot be manufactured. It only comes from generous donors like you.',
  'Someone needs blood every few minutes, for surgeries, childbirth, and emergencies alike.',
  'Every blood type is needed. There is no such thing as a type that does not matter.',
  'A steady blood supply depends on requests like yours being met by willing donors.',
];

// ── Icon helper ──────────────────────────────────────────────────────

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
  mapPin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
};

function icon(name, extraClass) {
  const span = document.createElement('span');
  span.className = extraClass ? `dash-icon ${extraClass}` : 'dash-icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = ICON_SVGS[name] || '';
  return span;
}

// ── Scroll reveal ────────────────────────────────────────────────────
// Fades and rises an element into place the first time it scrolls into
// the viewport. The masthead is excluded, it is above the fold and uses
// its own immediate entrance animation from dashboard.css. One shared
// observer for the page; each element unobserves itself once revealed.

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
  renderMasthead();
  renderTicker();
  renderEditGrid();
  renderDirectory();
  loadStatusBanner(); // scoped, non-blocking, see file header
}

// ── Masthead ─────────────────────────────────────────────────────────

function renderMasthead() {
  const container = document.getElementById('dashboard-hero');
  container.textContent = '';

  const grid = document.createElement('div');
  grid.className = 'masthead-grid';

  // Main column
  const main = document.createElement('div');

  const kicker = document.createElement('div');
  kicker.className = 'masthead-kicker';
  kicker.appendChild(icon('shieldCheck', 'masthead-kicker-icon'));
  const kickerText = document.createElement('span');
  kickerText.textContent = 'Philippine Red Cross, Batangas Chapter';
  kicker.appendChild(kickerText);

  const headline = document.createElement('h1');
  headline.className = 'masthead-headline';
  headline.textContent = 'Every request matters. Every donor makes it possible.';

  const sub = document.createElement('p');
  sub.className = 'masthead-subtext';
  sub.textContent = "Submit a blood request and we'll connect you with the nearest available supply.";

  const cta = document.createElement('a');
  cta.className = 'masthead-cta';
  cta.href = ROUTES.REQUESTOR.SUBMIT_REQUEST;
  const ctaLabel = document.createElement('span');
  ctaLabel.textContent = 'Submit a Request';
  cta.appendChild(ctaLabel);
  cta.appendChild(icon('arrowRight', 'masthead-cta-icon'));

  const trustNote = document.createElement('p');
  trustNote.className = 'masthead-trust-note';
  trustNote.appendChild(icon('lock'));
  const trustText = document.createElement('span');
  trustText.textContent = 'Reviewed only by verified PRC staff. Kept confidential.';
  trustNote.appendChild(trustText);

  main.appendChild(kicker);
  main.appendChild(headline);
  main.appendChild(sub);
  main.appendChild(cta);
  main.appendChild(trustNote);

  // Aside column, "in this issue" style stat panel
  const aside = document.createElement('div');
  aside.className = 'masthead-aside';

  const asideTitle = document.createElement('p');
  asideTitle.className = 'masthead-aside-title';
  asideTitle.textContent = 'At a Glance';
  aside.appendChild(asideTitle);

  const statList = document.createElement('div');
  statList.className = 'masthead-stat-list';

  const stats = [
    { iconName: 'shieldCheck', title: 'Verified reviews', desc: 'Every request checked by PRC staff before approval.' },
    { iconName: 'mapPin',      title: '4 branches',        desc: 'Batangas City, Lipa, Nasugbu, and Tanauan.' },
    { iconName: 'lock',        title: 'Confidential',      desc: "Your information is never shared beyond what's needed." },
  ];

  stats.forEach((stat) => {
    const row = document.createElement('div');
    row.className = 'masthead-stat-row';

    const iconWrap = document.createElement('span');
    iconWrap.className = 'masthead-stat-icon';
    iconWrap.appendChild(icon(stat.iconName));

    const textWrap = document.createElement('div');
    const title = document.createElement('p');
    title.className = 'masthead-stat-title';
    title.textContent = stat.title;
    const desc = document.createElement('p');
    desc.className = 'masthead-stat-desc';
    desc.textContent = stat.desc;
    textWrap.appendChild(title);
    textWrap.appendChild(desc);

    row.appendChild(iconWrap);
    row.appendChild(textWrap);
    statList.appendChild(row);
  });

  aside.appendChild(statList);

  grid.appendChild(main);
  grid.appendChild(aside);
  container.appendChild(grid);
}

// ── Status banner, only present with an active request ─────────────

async function loadStatusBanner() {
  const container = document.getElementById('status-banner');

  try {
    const requests = await getMyRequests();
    const active = requests
      .filter(r => ['Pending', 'Approved', 'Waiting'].includes(r.status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    if (!active) {
      container.textContent = '';
      container.className = '';
      return;
    }
    renderStatusBanner(container, active);
  } catch (err) {
    renderStatusError(container);
  }
}

function renderStatusBanner(container, request) {
  container.textContent = '';
  container.className = 'db-status-banner';

  const inner = document.createElement('div');
  inner.className = 'status-banner-inner';

  const left = document.createElement('div');
  left.className = 'status-banner-left';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'status-banner-icon';
  iconWrap.appendChild(icon('droplet'));
  left.appendChild(iconWrap);

  const textWrap = document.createElement('div');
  const label = document.createElement('p');
  label.className = 'status-banner-label';
  label.textContent = 'Active Request';
  const title = document.createElement('p');
  title.className = 'status-banner-title';
  title.textContent = `Request at ${request.branch_name}`;
  textWrap.appendChild(label);
  textWrap.appendChild(title);
  left.appendChild(textWrap);

  if (request.status === 'Rejected' || request.status === 'Cancelled') {
    const note = document.createElement('p');
    note.className = 'status-banner-note';
    note.textContent = `This request was ${request.status.toLowerCase()}.`;
    left.appendChild(note);
  } else {
    left.appendChild(renderCompactStepper(request.status));
  }

  const link = document.createElement('a');
  link.className = 'status-banner-link';
  link.href = ROUTES.REQUESTOR.REQUESTS;
  const linkLabel = document.createElement('span');
  linkLabel.textContent = 'View My Requests';
  link.appendChild(linkLabel);
  link.appendChild(icon('arrowRight'));

  inner.appendChild(left);
  inner.appendChild(link);
  container.appendChild(inner);
  reveal(inner);
}

function renderCompactStepper(currentStatus) {
  const stepper = document.createElement('div');
  stepper.className = 'status-stepper-compact';

  const currentIndex = STEPS.indexOf(currentStatus);

  STEPS.forEach((step, i) => {
    const stepEl = document.createElement('span');
    stepEl.className = 'status-stepper-compact-step';
    if (i < currentIndex) stepEl.classList.add('status-stepper-compact-step--done');
    if (i === currentIndex) stepEl.classList.add('status-stepper-compact-step--active');

    const dot = document.createElement('span');
    dot.className = 'status-stepper-compact-dot';
    dot.appendChild(icon(STEP_ICONS[step]));

    stepEl.appendChild(dot);
    stepper.appendChild(stepEl);
  });

  return stepper;
}

function renderStatusError(container) {
  container.textContent = '';
  container.className = 'db-status-banner';

  const inner = document.createElement('div');
  inner.className = 'status-banner-inner';

  const left = document.createElement('div');
  left.className = 'status-banner-left';
  left.appendChild(icon('alert'));

  const textWrap = document.createElement('div');
  const note = document.createElement('p');
  note.className = 'status-banner-note';
  note.textContent = "We couldn't load your request status.";
  textWrap.appendChild(note);
  left.appendChild(textWrap);

  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = 'btn-retry status-banner-retry';
  retryBtn.textContent = 'Retry';
  retryBtn.addEventListener('click', () => loadStatusBanner());

  inner.appendChild(left);
  inner.appendChild(retryBtn);
  container.appendChild(inner);
  reveal(inner);
}

// ── Ticker ───────────────────────────────────────────────────────────

function renderTicker() {
  const container = document.getElementById('fact-ticker');
  container.className = 'db-ticker';
  container.textContent = '';

  container.appendChild(icon('quote', 'ticker-icon'));

  const text = document.createElement('span');
  text.className = 'ticker-text';
  text.textContent = DONATION_FACTS[0];
  container.appendChild(text);

  let index = 0;
  setInterval(() => {
    text.classList.add('ticker-fading');
    setTimeout(() => {
      index = (index + 1) % DONATION_FACTS.length;
      text.textContent = DONATION_FACTS[index];
      text.classList.remove('ticker-fading');
    }, 300);
  }, 6000);
}

// ── Edit grid, bento layout ──────────────────────────────────────────

function renderEditGrid() {
  const container = document.getElementById('edit-grid');
  container.className = 'db-edit-grid';
  container.textContent = '';

  const inner = document.createElement('div');
  inner.className = 'edit-grid-inner';

  const intro = document.createElement('div');
  intro.className = 'edit-grid-intro';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'section-eyebrow';
  eyebrow.textContent = 'Why BloodSync';
  const heading = document.createElement('h2');
  heading.className = 'section-heading';
  heading.textContent = 'Built on trust, backed by the Red Cross';
  intro.appendChild(eyebrow);
  intro.appendChild(heading);
  inner.appendChild(intro);
  reveal(intro);

  const tiles = document.createElement('div');
  tiles.className = 'edit-grid-tiles';

  // Feature tile
  const feature = document.createElement('div');
  feature.className = 'tile tile-feature';
  const featureIcon = document.createElement('span');
  featureIcon.className = 'tile-icon-lg';
  featureIcon.appendChild(icon('shieldCheck'));
  const featureTitle = document.createElement('p');
  featureTitle.className = 'tile-feature-title';
  featureTitle.textContent = 'Verified and confidential';
  const featureText = document.createElement('p');
  featureText.className = 'tile-feature-text';
  featureText.textContent = "Every request is reviewed by Philippine Red Cross staff before approval. Your information is never shared beyond what's needed to process it.";
  feature.appendChild(featureIcon);
  feature.appendChild(featureTitle);
  feature.appendChild(featureText);
  tiles.appendChild(feature);
  reveal(feature);

  // Branches tile
  const branches = document.createElement('div');
  branches.className = 'tile tile-branches';
  const branchesTitle = document.createElement('p');
  branchesTitle.className = 'tile-branches-title';
  branchesTitle.textContent = '4 branches across Batangas';
  const branchesDesc = document.createElement('p');
  branchesDesc.className = 'tile-branches-desc';
  branchesDesc.textContent = "You'll be matched to whichever branch can help fastest.";
  const chipList = document.createElement('div');
  chipList.className = 'branch-chip-list';
  BRANCHES.forEach((b) => {
    const chip = document.createElement('span');
    chip.className = 'branch-chip';
    chip.appendChild(icon('mapPin'));
    const label = document.createElement('span');
    label.textContent = b.name;
    chip.appendChild(label);
    chipList.appendChild(chip);
  });
  branches.appendChild(branchesTitle);
  branches.appendChild(branchesDesc);
  branches.appendChild(chipList);
  tiles.appendChild(branches);
  reveal(branches, 100);

  // How-it-works step tiles
  HOW_IT_WORKS_STEPS.forEach((step, i) => {
    const tile = document.createElement('div');
    tile.className = `tile tile-step tile-step-${i + 1}`;

    const num = document.createElement('span');
    num.className = 'tile-step-num';
    num.textContent = String(i + 1);

    const title = document.createElement('p');
    title.className = 'tile-step-title';
    title.textContent = step.title;

    const desc = document.createElement('p');
    desc.className = 'tile-step-desc';
    desc.textContent = step.desc;

    tile.appendChild(num);
    tile.appendChild(title);
    tile.appendChild(desc);
    tiles.appendChild(tile);
    reveal(tile, 180 + i * 100);
  });

  inner.appendChild(tiles);
  container.appendChild(inner);
}

// ── Branch directory ─────────────────────────────────────────────────

function renderDirectory() {
  const container = document.getElementById('branch-directory');
  container.className = 'db-directory';
  container.textContent = '';

  const inner = document.createElement('div');
  inner.className = 'directory-inner';

  const titleRow = document.createElement('div');
  titleRow.className = 'directory-title-row';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'section-eyebrow';
  eyebrow.textContent = 'Find a Branch';
  const heading = document.createElement('h2');
  heading.className = 'section-heading';
  heading.textContent = 'PRC Batangas Chapter branches';
  titleRow.appendChild(eyebrow);
  titleRow.appendChild(heading);
  inner.appendChild(titleRow);
  reveal(titleRow);

  const list = document.createElement('div');
  list.className = 'directory-list';

  BRANCHES.forEach((b, i) => {
    const item = document.createElement('div');
    item.className = 'directory-item';

    const iconWrap = document.createElement('span');
    iconWrap.className = 'directory-item-icon';
    iconWrap.appendChild(icon('mapPin'));

    const textWrap = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'directory-item-name';
    name.textContent = b.name;
    const sub = document.createElement('p');
    sub.className = 'directory-item-sub';
    sub.textContent = b.sub;
    textWrap.appendChild(name);
    textWrap.appendChild(sub);

    item.appendChild(iconWrap);
    item.appendChild(textWrap);
    list.appendChild(item);
    reveal(item, 80 + i * 80);
  });

  inner.appendChild(list);
  container.appendChild(inner);
}