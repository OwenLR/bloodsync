import { showToast }          from '../../components/toast.js';
import { NOTIFICATION_TYPES } from '../../constants/notificationTypes.js';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from './notificationsApi.js';

const LIST_ID     = 'notifications-list';
const SKELETON_ID = 'notifications-skeleton';
const ERROR_ID    = 'notifications-error';
const MARK_ALL_ID = 'btn-mark-all-read';

// Human-readable labels per notification type. Any type not listed here
// (e.g. a new NOTIFICATION_TYPES entry added backend-side before the
// frontend catches up) falls back to a generic label rather than showing
// the raw type string or breaking the render.
// Note: DONOR_POST_EXTRACTION will likely never appear here — donors have
// no login/frontend, so notifyDonorPostExtraction() only sends an email,
// it never calls notificationModel.createNotification(). Kept in the map
// anyway for completeness in case that ever changes.
const TYPE_LABELS = {
  [NOTIFICATION_TYPES.BLOOD_REQUEST_NEW]:     'Blood Request',
  [NOTIFICATION_TYPES.BLOOD_REQUEST_STATUS]:  'Blood Request Update',
  [NOTIFICATION_TYPES.BLOOD_DRIVE_ASSIGNED]:  'Blood Drive',
  [NOTIFICATION_TYPES.DONOR_POST_EXTRACTION]: 'Donor',
  [NOTIFICATION_TYPES.INVENTORY_LOW]:         'Inventory Alert',
  [NOTIFICATION_TYPES.INVENTORY_EXPIRING]:    'Inventory Alert',
};

function getTypeLabel(type) {
  return TYPE_LABELS[type] || 'Notification';
}

// ---------------------------------------------------------------------------
// Public entry — called from js/entry/shared/notifications.js
// ---------------------------------------------------------------------------

export async function renderNotificationsList() {
  showSkeleton();

  try {
    const notifications = await getMyNotifications();
    hideSkeleton();
    renderList(notifications);
  } catch (err) {
    hideSkeleton();
    showLoadError(err.message);
  }
}

export function initMarkAllRead() {
  const btn = document.getElementById(MARK_ALL_ID);
  if (!btn) return;
  btn.addEventListener('click', handleMarkAllRead);
}

// ---------------------------------------------------------------------------
// Badge — exported for reuse by other pages' entry files later (Step B).
// navbar.js always renders #notif-badge regardless of page/role, so this
// is safe to call from any entry file once wired up, not just this page's.
// ---------------------------------------------------------------------------

export function updateBadge(count) {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;

  badge.textContent = count > 0 ? count : '';
  badge.classList.toggle('notif-badge-hidden', count <= 0);
}

export async function refreshBadge() {
  try {
    const count = await getUnreadCount();
    updateBadge(count);
  } catch {
    // Non-blocking — badge just keeps its last known state on failure.
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderList(notifications) {
  const list = document.getElementById(LIST_ID);
  list.textContent = '';

  if (!notifications.length) {
    list.style.display = 'none';
    showEmptyState();
    return;
  }

  hideEmptyState();
  list.style.display = '';
  notifications.forEach(n => list.appendChild(buildItem(n)));
}

function buildItem(notification) {
  const item = document.createElement('div');
  item.className = 'notification-item' +
    (notification.is_read ? '' : ' notification-item--unread');
  item.dataset.notificationId = notification.notification_id;

  const header = document.createElement('div');
  header.className = 'notification-item-header';

  const typeLabel = document.createElement('span');
  typeLabel.className   = 'notification-type-label';
  typeLabel.textContent = getTypeLabel(notification.type);

  const time = document.createElement('span');
  time.className   = 'notification-time';
  time.textContent = formatDate(notification.created_at);

  header.appendChild(typeLabel);
  header.appendChild(time);

  const title = document.createElement('h3');
  title.className   = 'notification-title';
  title.textContent = notification.title;

  const message = document.createElement('p');
  message.className   = 'notification-message';
  message.textContent = notification.message;

  item.appendChild(header);
  item.appendChild(title);
  item.appendChild(message);

  // No click-to-navigate — reference_id/reference_type exist on the
  // record but their target pages (Blood Requests, My Drive) aren't
  // built yet. Display-only for this pass.
  if (!notification.is_read) {
    const markBtn = document.createElement('button');
    markBtn.className   = 'btn-secondary btn-xs notification-mark-read-btn';
    markBtn.textContent = 'Mark read';
    markBtn.addEventListener('click', () =>
      handleMarkOneRead(notification.notification_id, item, markBtn));
    item.appendChild(markBtn);
  }

  return item;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function handleMarkOneRead(notificationId, itemEl, btnEl) {
  btnEl.disabled     = true;
  btnEl.textContent  = 'Saving…';

  try {
    await markAsRead(notificationId);
    itemEl.classList.remove('notification-item--unread');
    btnEl.remove();
    await refreshBadge();
  } catch (err) {
    btnEl.disabled    = false;
    btnEl.textContent = 'Mark read';
    showToast(err.message, 'error');
  }
}

async function handleMarkAllRead() {
  const btn          = document.getElementById(MARK_ALL_ID);
  const originalText = btn.textContent;
  btn.disabled    = true;
  btn.textContent = 'Saving…';

  try {
    await markAllAsRead();
    showToast('All notifications marked as read.', 'success');
    await renderNotificationsList();
    await refreshBadge();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = originalText;
  }
}

// ---------------------------------------------------------------------------
// Skeleton / error / empty state helpers
// ---------------------------------------------------------------------------

function showSkeleton() {
  document.getElementById(SKELETON_ID).style.display = '';
  document.getElementById(LIST_ID).style.display      = 'none';
  document.getElementById(ERROR_ID).textContent       = '';
}

function hideSkeleton() {
  document.getElementById(SKELETON_ID).style.display = 'none';
}

function showLoadError(message) {
  const el = document.getElementById(ERROR_ID);
  el.textContent = message || 'Could not load notifications. Please try again.';
}

function showEmptyState() {
  let empty = document.getElementById('notifications-empty-state');
  if (!empty) {
    empty           = document.createElement('div');
    empty.id        = 'notifications-empty-state';
    empty.className = 'empty-state';

    const h3 = document.createElement('h3');
    h3.textContent = 'No notifications yet';
    const p = document.createElement('p');
    p.textContent = 'You\u2019ll see updates here as they happen.';

    empty.appendChild(h3);
    empty.appendChild(p);
    document.getElementById(LIST_ID).insertAdjacentElement('afterend', empty);
  }
  empty.style.display = '';
}

function hideEmptyState() {
  const empty = document.getElementById('notifications-empty-state');
  if (empty) empty.style.display = 'none';
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}