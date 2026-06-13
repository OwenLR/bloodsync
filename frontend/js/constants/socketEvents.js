/**
 * socketEvents.js — Socket.io event name constants.
 *
 * Import from here instead of hardcoding event name strings in feature files.
 * These are the events emitted by the backend socketHandler.js.
 * If the backend renames an event, update here — no other files change.
 *
 * Usage:
 *   import { SOCKET_EVENTS } from '../constants/socketEvents.js';
 *   socket.on(SOCKET_EVENTS.BLOOD_REQUEST_NEW, handler);
 */

export const SOCKET_EVENTS = Object.freeze({
  BLOOD_REQUEST_NEW:    'blood_request_new',
  BLOOD_REQUEST_STATUS: 'blood_request_status',
  INVENTORY_LOW:        'inventory_low',
  INVENTORY_EXPIRING:   'inventory_expiring',
});