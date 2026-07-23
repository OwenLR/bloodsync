/**
 * editToggle.js — Generic view/edit toggle for profile-style cards.
 *
 * A card marks its read-only content with [data-view] and its editable
 * form with [data-edit], plus a trigger button [data-edit-trigger] and
 * an optional cancel button [data-edit-cancel]. This helper wires the
 * swap between them so a card defaults to showing data, not an open
 * form — used by the Password and Contact & Address cards on the
 * Profile pages.
 *
 * Does NOT know anything about the data inside — purely toggles
 * visibility via the .hidden utility (main.css).
 *
 * Usage:
 *   const { setViewMode, setEditMode } = initEditToggle('password-card');
 *   // after a successful save:
 *   setViewMode();
 */
export function initEditToggle(cardId) {
  const card = document.getElementById(cardId);
  if (!card) return { setViewMode: () => {}, setEditMode: () => {} };

  const viewBlock = card.querySelector('[data-view]');
  const editBlock = card.querySelector('[data-edit]');
  const editBtn   = card.querySelector('[data-edit-trigger]');
  const cancelBtn = card.querySelector('[data-edit-cancel]');

  function setViewMode() {
    viewBlock?.classList.remove('hidden');
    editBlock?.classList.add('hidden');
    editBtn?.classList.remove('hidden');
  }

  function setEditMode() {
    viewBlock?.classList.add('hidden');
    editBlock?.classList.remove('hidden');
    editBtn?.classList.add('hidden');
  }

  editBtn?.addEventListener('click', setEditMode);
  cancelBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    setViewMode();
  });

  setViewMode();
  return { setViewMode, setEditMode };
}