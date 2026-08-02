/**
 * icons.js — Minimal inline SVG icon set for navbar.js / sidebar.js.
 *
 * Deliberately NOT an icon library import (lucide, feather, etc.) — keeps
 * the shell dependency-free and CSP-simple, same reasoning as the project
 * avoiding a frontend build step. Every icon is hand-drawn at 20x20 with
 * a shared stroke language (round caps/joins, 1.6 stroke) so the whole set
 * reads as one family.
 *
 * Usage:
 *   import { icon, labelIcon } from './icons.js';
 *   el.appendChild(icon('bell', 18));
 *   el.appendChild(icon(labelIcon('Blood Drives')));
 */

const PATHS = {
  droplet:      '<path d="M10 2.4s5.6 6.4 5.6 10.3a5.6 5.6 0 1 1-11.2 0C4.4 8.8 10 2.4 10 2.4Z"/>',
  dropletCheck: '<path d="M9.6 2.4s5 5.9 5 9.6a5 5 0 1 1-10 0c0-3.7 5-9.6 5-9.6Z"/><path d="M7.4 12.1l1.6 1.6 3-3.3"/>',
  bell:         '<path d="M6 8.2a4 4 0 0 1 8 0c0 3.8 1.4 4.8 1.4 4.8H4.6S6 12 6 8.2Z"/><path d="M8.3 15.6a1.8 1.8 0 0 0 3.4 0"/>',
  power:        '<path d="M10 3.2v6"/><path d="M6.1 5.3a6 6 0 1 0 7.8 0"/>',
  chevron:      '<path d="M5.5 7.7 10 12.3l4.5-4.6"/>',
  home:         '<path d="M3 9.6 10 4.2l7 5.4"/><path d="M5 8.6V16h10V8.6"/>',
  users:        '<circle cx="7.2" cy="7" r="2.3"/><path d="M2.6 16c0-2.6 2-4.1 4.6-4.1s4.6 1.5 4.6 4.1"/><circle cx="14.2" cy="7.6" r="1.9"/><path d="M12.6 11.9c2.1.2 3.6 1.6 3.6 4.1"/>',
  list:         '<path d="M7.4 5.5h9M7.4 10h9M7.4 14.5h9"/><circle cx="3.6" cy="5.5" r=".9" fill="currentColor" stroke="none"/><circle cx="3.6" cy="10" r=".9" fill="currentColor" stroke="none"/><circle cx="3.6" cy="14.5" r=".9" fill="currentColor" stroke="none"/>',
  userPlus:     '<circle cx="8" cy="7" r="3"/><path d="M2.6 16.4c0-3 2.4-5 5.4-5s5.4 2 5.4 5"/><path d="M15.4 6v4M13.4 8h4"/>',
  clipboard:    '<rect x="5" y="4" width="10" height="13" rx="1.6"/><path d="M7.5 4V3.2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4"/><path d="M7.5 9h5M7.5 12h5M7.5 15h3"/>',
  calendar:     '<rect x="3" y="4.5" width="14" height="12" rx="1.6"/><path d="M3 8.5h14M7 2.6v3M13 2.6v3"/>',
  flask:        '<path d="M8.1 2.5h3.8M8.6 2.5v5.1L5 14.2a2 2 0 0 0 1.7 3h6.6a2 2 0 0 0 1.7-3l-3.6-6.6V2.5"/><path d="M6.6 12.6h6.8"/>',
  box:          '<path d="M3 6.5 10 3l7 3.5-7 3.5-7-3.5Z"/><path d="M3 6.5V14l7 3.5 7-3.5V6.5"/><path d="M10 10v7.4"/>',
  trash:        '<path d="M4.2 6h11.6"/><path d="M8 6V4.6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6"/><path d="M5.6 6l.7 9.9a1.5 1.5 0 0 0 1.5 1.4h4.4a1.5 1.5 0 0 0 1.5-1.4L14.4 6"/>',
  split:        '<path d="M4 5.2h3.6l4.6 9.6h3.8"/><path d="M4 14.8h3.6l1.8-3.7"/><path d="M14.4 3l3 2.2-3 2.2M14.4 12.6l3 2.2-3 2.2"/>',
  inbox:        '<path d="M3.2 11 5.5 4.3h9L16.8 11"/><path d="M3.2 11v4.3a1.5 1.5 0 0 0 1.5 1.5h10.6a1.5 1.5 0 0 0 1.5-1.5V11"/><path d="M3.2 11h4l.9 2h3.8l.9-2h4"/>',
  barChart:     '<path d="M4.2 16.4V10M10 16.4V4M15.8 16.4V8.6"/><path d="M3 17h14"/>',
  send:         '<path d="M17 3 3.2 9.1l5.4 2Z"/><path d="M17 3 11.6 16.6l-3-6.3Z"/><path d="M8.6 11.1 17 3"/>',
  clock:        '<circle cx="10" cy="10" r="7.1"/><path d="M10 6.2V10l2.8 1.8"/>',
  heartPulse:   '<path d="M2.8 10.4h3l1.4-3 2 6.2 1.7-4.6 1 1.4h5.3"/><path d="M10 16.3S4.4 13 3.2 9.6C2.3 7 4.1 4.6 6.6 4.6c1.4 0 2.6.8 3.4 2 .7-1.2 2-2 3.4-2 2.5 0 4.3 2.4 3.5 5-1.2 3.4-6.9 6.7-6.9 6.7Z"/>',
  dot:          '<circle cx="10" cy="10" r="3.2"/>',
};

const LABEL_ICON_MAP = {
  'Dashboard':                     'home',
  'Donors':                        'users',
  'Donor List':                    'list',
  'Register Donor':                'userPlus',
  'Conduct Interview':             'clipboard',
  'Conduct Screening':             'dropletCheck',
  'Record Donation & Collection':  'droplet',
  'Blood Drives':                  'calendar',
  'Blood Testing':                 'flask',
  'Blood Units':                   'box',
  'Inventory Cleaning':            'trash',
  'Blood Separation':              'split',
  'Blood Requests':                'inbox',
  'Users':                         'users',
  'Reports':                       'barChart',
  'Blood Drive Workflow':          'heartPulse',
  'My Assignment':                 'heartPulse',
  'Submit Request':                'send',
  'My Requests':                   'clock',
};

/**
 * Build a sized <span class="bs-icon"> containing the named SVG.
 * Unknown names fall back to a plain dot rather than throwing, so a new
 * sidebar item added without an icon mapping still renders cleanly.
 */
export function icon(name, size = 18) {
  const span = document.createElement('span');
  span.className = 'bs-icon';
  span.setAttribute('aria-hidden', 'true');
  span.style.width = size + 'px';
  span.style.height = size + 'px';
  span.innerHTML =
    `<svg viewBox="0 0 20 20" width="${size}" height="${size}" fill="none" ` +
    `stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">` +
    `${PATHS[name] || PATHS.dot}</svg>`;
  return span;
}

/** Look up the icon name for a given sidebar/nav label. Falls back to 'dot'. */
export function labelIcon(label) {
  return LABEL_ICON_MAP[label] || 'dot';
}
