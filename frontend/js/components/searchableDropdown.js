/**
 * searchableDropdown.js
 *
 * Reusable searchable dropdown component for the field donor workflow.
 * Replaces plain <select> and search-button patterns across all 5 steps.
 *
 * Behaviour:
 *   - Click input  → list opens, shows all items
 *   - Type         → list filters in real time (case-insensitive)
 *   - Click item   → item selected, list closes, onSelect callback fires
 *   - Click outside → list closes, input cleared if nothing was selected
 *   - Escape key   → list closes
 *   - Arrow keys   → navigate list items
 *
 * Usage:
 *   import { initSearchableDropdown } from '../components/searchableDropdown.js';
 *
 *   const dd = initSearchableDropdown({
 *     inputId:      'donor-input',
 *     listId:       'donor-list',
 *     items:         donors,
 *     displayFn:    (d) => `${d.last_name}, ${d.first_name}`,
 *     subDisplayFn: (d) => [d.blood_type, d.sex].filter(Boolean).join(' · '), // optional
 *     filterFn:     (d, q) => `${d.first_name} ${d.last_name}`.toLowerCase().includes(q),
 *     onSelect:     (donor) => handleDonorSelected(donor),
 *     placeholder:  'Search donor by name…',
 *     emptyMessage: 'No donors found.',
 *   });
 *
 *   dd.setItems(newItems);             // replace items after async load
 *   dd.selectByPredicate(d => d.donor_id === id); // restore prior selection
 *   dd.clear();                        // reset input and selection
 *   dd.destroy();                      // remove listeners on page unload
 */

export function initSearchableDropdown(options) {
  const {
    inputId,
    listId,
    displayFn,
    subDisplayFn  = null,
    filterFn,
    onSelect,
    placeholder   = 'Search\u2026',
    emptyMessage  = 'No results found.',
  } = options;

  let _items        = options.items || [];
  let _selectedItem = null;
  let _isOpen       = false;

  const inputEl = document.getElementById(inputId);
  const listEl  = document.getElementById(listId);

  if (!inputEl || !listEl) {
    console.warn(`searchableDropdown: element not found — inputId="${inputId}", listId="${listId}"`);
    return { setItems, selectByPredicate, clear, destroy };
  }

  // ── Setup ──────────────────────────────────────────────────────────────────

  inputEl.setAttribute('placeholder', placeholder);
  inputEl.setAttribute('autocomplete', 'off');
  inputEl.setAttribute('role', 'combobox');
  inputEl.setAttribute('aria-expanded', 'false');
  inputEl.setAttribute('aria-autocomplete', 'list');
  listEl.setAttribute('role', 'listbox');
  listEl.style.display = 'none'; // start hidden

  inputEl.addEventListener('click', () => {
    if (!_isOpen) _openList();
  });

  inputEl.addEventListener('input', () => {
    if (!_isOpen) _openList();
    // Clear selection when user edits — they must re-pick
    if (_selectedItem) {
      _selectedItem = null;
      inputEl.setAttribute('aria-selected', 'false');
    }
    _renderList(inputEl.value.trim());
  });

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { _closeList(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const first = listEl.querySelector('.sd-item:not(.sd-item--empty)');
      if (first) first.focus();
    }
  });

  listEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { _closeList(); inputEl.focus(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = document.activeElement.nextElementSibling;
      if (next && next.classList.contains('sd-item')) next.focus();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = document.activeElement.previousElementSibling;
      if (prev && prev.classList.contains('sd-item')) prev.focus();
      else inputEl.focus();
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); document.activeElement.click(); }
  });

  document.addEventListener('click', _handleOutsideClick);

  // ── Render ─────────────────────────────────────────────────────────────────

  function _renderList(query) {
    listEl.innerHTML = '';
    const q        = (query || '').toLowerCase();
    const filtered = q ? _items.filter(item => filterFn(item, q)) : [..._items];

    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.className   = 'sd-item sd-item--empty';
      li.textContent = emptyMessage;
      listEl.appendChild(li);
      return;
    }

    filtered.forEach(item => {
      const li = document.createElement('li');
      li.className = 'sd-item';
      li.tabIndex  = -1;
      li.setAttribute('role', 'option');

      const primary = document.createElement('span');
      primary.className   = 'sd-item-primary';
      primary.textContent = displayFn(item);
      li.appendChild(primary);

      if (subDisplayFn) {
        const sub = document.createElement('span');
        sub.className   = 'sd-item-sub';
        sub.textContent = subDisplayFn(item) || '';
        li.appendChild(sub);
      }

      // mousedown prevents input blur before click fires
      li.addEventListener('mousedown', (e) => e.preventDefault());
      li.addEventListener('click', () => _selectItem(item));

      listEl.appendChild(li);
    });
  }

  function _openList() {
    _isOpen = true;
    listEl.style.display = '';
    inputEl.setAttribute('aria-expanded', 'true');
    _renderList(inputEl.value.trim());
  }

  function _closeList() {
    _isOpen = false;
    listEl.style.display = 'none';
    inputEl.setAttribute('aria-expanded', 'false');
    // If nothing selected and input has partial text, clear it
    if (!_selectedItem && inputEl.value) inputEl.value = '';
  }

  function _selectItem(item) {
    _selectedItem = item;
    inputEl.value = displayFn(item);
    inputEl.setAttribute('aria-selected', 'true');
    _closeList();
    onSelect(item);
  }

  function _handleOutsideClick(e) {
    if (_isOpen && !inputEl.contains(e.target) && !listEl.contains(e.target)) {
      _closeList();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function setItems(newItems) {
    _items = newItems || [];
    if (_isOpen) _renderList(inputEl.value.trim());
  }

  function selectByPredicate(predicate) {
    const item = _items.find(predicate);
    if (item) _selectItem(item);
  }

  function clear() {
    _selectedItem = null;
    if (inputEl) inputEl.value = '';
    if (inputEl) inputEl.setAttribute('aria-selected', 'false');
    _closeList();
  }

  function destroy() {
    document.removeEventListener('click', _handleOutsideClick);
  }

  return { setItems, selectByPredicate, clear, destroy };
}