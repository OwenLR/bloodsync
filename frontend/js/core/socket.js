/**
 * socket.js — Socket.io client setup for BloodSync web app.
 *
 * Responsibilities:
 * - Initialize the Socket.io connection with auth payload
 * - Export event name constants for use across feature files
 * - Export the socket instance for feature files to attach listeners
 *
 * Room assignment is handled server-side on connect —
 * the backend reads user_id, role_id, and branch_id from
 * socket.handshake.auth and joins the correct rooms automatically.
 * The frontend does NOT emit join_room manually.
 *
 * This file does NOT attach any event listeners itself.
 * Feature files (e.g. bloodRequestUI.js) import { socket } and
 * call socket.on(SOCKET_EVENTS.BLOOD_REQUEST_NEW, handler) directly.
 */

import { API_BASE_URL }    from '../constants/config.js';
import { getCurrentUser }  from './auth.js';

// ---------------------------------------------------------------------------
// Socket event name constants
// Mirror the values emitted by the backend — never hardcode these in feature files
// ---------------------------------------------------------------------------

export const SOCKET_EVENTS = {
  BLOOD_REQUEST_NEW:    'blood_request_new',
  BLOOD_REQUEST_STATUS: 'blood_request_status',
  INVENTORY_LOW:        'inventory_low',
  INVENTORY_EXPIRING:   'inventory_expiring',
};

// ---------------------------------------------------------------------------
// Socket instance — exported for feature files to attach listeners
// ---------------------------------------------------------------------------

export let socket = null;

// ---------------------------------------------------------------------------
// initSocket()
// Call once after the user is authenticated (e.g. in the page entry file).
// Safe to call multiple times — skips init if already connected.
// ---------------------------------------------------------------------------

export async function initSocket() {
  if (socket && socket.connected) return;

  const user = await getCurrentUser();
  if (!user) return;

  // Socket.io is loaded via CDN script tag in each HTML page —
  // it attaches to window.io
  if (typeof io === 'undefined') {
    console.error('Socket.io client not loaded. Add the CDN script tag to the page.');
    return;
  }

  const url = API_BASE_URL || window.location.origin;

  socket = io(url, {
    auth: {
      user_id:   user.user_id,
      role_id:   user.role_id,
      branch_id: user.branch_id ?? null,
    },
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });
}