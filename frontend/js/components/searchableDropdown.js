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
 *   - (optional) suggestFn → after the user pauses typing, an async
 *     "Did you mean…?" section is appended below the local matches
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
 *
 *     // Optional fuzzy suggestions (all four are ignored if suggestFn is omitted):
 *     suggestFn:       (q) => searchSimilarDonors(q),  // async, returns items
 *     suggestLabel:    'Did you mean…?',
 *     suggestMinChars: 3,
 *     suggestDelay:    300,
 *     suggestKeyFn:    (d) => d.donor_id,  // used to hide suggestions already shown locally
 *
 *     // Optional: fires when the user edits the input after a selection was
 *     // made (typing, backspacing to empty), which un-selects the item.
 *     // NOT fired by dd.clear() or dd.selectByPredicate() — those are
 *     // programmatic, so the caller already knows. Lets a page that uses the
 *     // selection as a filter (e.g. Blood Units donor filter) reset it.
 *     onClear:         () => resetFilter(),
 *   });
 *
 *   dd.setItems(newItems);             // replace items after async load
 *   dd.selectByPredicate(d => d.donor_id === id); // restore prior selection
 *   dd.clear();                        // reset input and selection
 *   dd.destroy();                      // remove listeners on page unload
 *
 * Existing callers that do not pass suggestFn behave exactly as before.
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

    // ── Optional fuzzy suggestions ──────────────────────────────────────────
    suggestFn       = null,
    suggestLabel    = 'Did you mean\u2026?',
    suggestMinChars = 3,
    suggestDelay    = 300,
    suggestKeyFn    = (item) => item.donor_id,

    // ── Optional: notified when an existing selection is un-selected by editing
    onClear         = null,
  } = options;

  let _items        = options.items || [];
  let _selectedItem = null;
  let _isOpen       = false;
  let _suggestTimer = null;
  let _suggestSeq   = 0;   // guards against stale async responses

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
      if (onClear) onClear();
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
      const next = _nextSelectable(document.activeElement, 'nextElementSibling');
      if (next) next.focus();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = _nextSelectable(document.activeElement, 'previousElementSibling');
      if (prev) prev.focus();
      else inputEl.focus();
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); document.activeElement.click(); }
  });

  document.addEventListener('click', _handleOutsideClick);

  // ── Render ─────────────────────────────────────────────────────────────────

  /**
   * Walk siblings in the given direction and return the first real,
   * selectable item — skipping the "Did you mean?" header and the
   * "no results" row, neither of which should receive keyboard focus.
   */
  function _nextSelectable(fromEl, direction) {
    let el = fromEl ? fromEl[direction] : null;
    while (el) {
      if (el.classList.contains('sd-item') && !el.classList.contains('sd-item--empty')) {
        return el;
      }
      el = el[direction];
    }
    return null;
  }

  function _buildItem(item) {
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

    return li;
  }

  function _renderList(query) {
    listEl.innerHTML = '';
    const q        = (query || '').toLowerCase();
    const filtered = q ? _items.filter(item => filterFn(item, q)) : [..._items];

    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.className   = 'sd-item sd-item--empty';
      li.textContent = emptyMessage;
      listEl.appendChild(li);
    } else {
      filtered.forEach(item => listEl.appendChild(_buildItem(item)));
    }

    _scheduleSuggestions(query, filtered);
  }

  /**
   * Debounced server-side fuzzy lookup. Appends a "Did you mean…?" section
   * below the local matches. Best-effort: any failure is silently ignored,
   * and stale responses (user kept typing, or list closed) are discarded.
   */
  function _scheduleSuggestions(query, localMatches) {
    clearTimeout(_suggestTimer);
    const seq = ++_suggestSeq;

    if (!suggestFn || !query || query.length < suggestMinChars) return;

    _suggestTimer = setTimeout(async () => {
      let results = [];
      try {
        results = await suggestFn(query);
      } catch (_err) {
        return;
      }
      if (seq !== _suggestSeq || !_isOpen) return;

      // Hide anything the local filter already showed
      const localKeys = new Set(localMatches.map(suggestKeyFn));
      const extra     = (results || []).filter(r => !localKeys.has(suggestKeyFn(r)));
      if (extra.length === 0) return;

      // Local search found nothing — suggestions replace the "no match" row
      if (localMatches.length === 0) {
        const emptyRow = listEl.querySelector('.sd-item--empty');
        if (emptyRow) emptyRow.remove();
      }

      const header = document.createElement('li');
      header.className   = 'sd-header';
      header.textContent = suggestLabel;
      header.setAttribute('role', 'presentation');
      listEl.appendChild(header);

      extra.forEach(item => listEl.appendChild(_buildItem(item)));
    }, suggestDelay);
  }

  function _openList() {
    _isOpen = true;
    listEl.style.display = '';
    inputEl.setAttribute('aria-expanded', 'true');
    _renderList(inputEl.value.trim());
  }

  function _closeList() {
    clearTimeout(_suggestTimer);
    _suggestSeq++;   // invalidate any in-flight suggestion request
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
    clearTimeout(_suggestTimer);
    _suggestSeq++;
    document.removeEventListener('click', _handleOutsideClick);
  }

  return { setItems, selectByPredicate, clear, destroy };
}