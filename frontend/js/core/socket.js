/**
 * socket.js — Socket.io client setup for BloodSync web app.
 *
 * Responsibilities:
 * - Initialize the Socket.io connection with auth payload
 * - Export the socket instance for feature files to attach listeners
 *
 * Does NOT attach feature-specific event listeners.
 * Infrastructure listeners (connect, disconnect, connect_error) are allowed
 * here — they are transport concerns, not feature concerns.
 *
 * Room assignment is handled server-side on connect —
 * the backend reads user_id, role_id, and branch_id from
 * socket.handshake.auth and joins the correct rooms automatically.
 * The frontend does NOT emit join_room manually.
 *
 * Socket event name constants live in constants/socketEvents.js.
 * Feature files import { socket } and attach listeners directly:
 *   socket.on(SOCKET_EVENTS.BLOOD_REQUEST_NEW, handler);
 *
 * Socket.io client is loaded via CDN script tag in each HTML page
 * that needs real-time — it attaches to window.io.
 */

import { API_BASE_URL }   from '../constants/apiConfig.js';
import { getCurrentUser } from './auth.js';

export let socket = null;

/**
 * initSocket()
 * Call once after the user is authenticated (in the page entry file).
 * Safe to call multiple times — skips init if already connected.
 */
export async function initSocket() {
  if (socket && socket.connected) return;

  const user = await getCurrentUser();
  if (!user) return;

  if (typeof io === 'undefined') {
    console.error('[Socket] Socket.io client not loaded. Add the CDN script tag to the page.');
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