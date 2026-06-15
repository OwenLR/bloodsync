/**
 * search.js — Debounced search bar component for BloodSync web app.
 *
 * Responsibilities:
 * - initSearch() — attach a debounced input listener to a search field
 * - Calls the provided handler only after the user stops typing
 *
 * Does NOT:
 * - Fetch any data directly
 * - Know anything about business logic
 * - Render search results
 *
 * Usage:
 *   import { initSearch } from '../components/search.js';
 *
 *   initSearch('donor-search', async (query) => {
 *     const results = await searchDonors(query);
 *     renderDonors(results);
 *   });
 *
 * Requires an <input id="donor-search"> element in the HTML page.
 * Default debounce delay: 400ms.
 */

const DEFAULT_DELAY_MS = 400;

// ---------------------------------------------------------------------------
// initSearch(inputId, onSearch, delay)
// ---------------------------------------------------------------------------

/**
 * Attach a debounced listener to a search input.
 *
 * @param {string}   inputId  — ID of the search input element
 * @param {function} onSearch — called with the trimmed query string
 * @param {number}   delay    — debounce delay in ms (default 400)
 * @returns {function} cleanup — call to remove the event listener
 */
export function initSearch(inputId, onSearch, delay = DEFAULT_DELAY_MS) {
  const input = document.getElementById(inputId);
  if (!input) return () => {};

  let timer = null;

  const handler = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      onSearch(input.value.trim());
    }, delay);
  };

  input.addEventListener('input', handler);

  // Return cleanup function for page teardown
  return () => {
    clearTimeout(timer);
    input.removeEventListener('input', handler);
  };
}

// ---------------------------------------------------------------------------
// clearSearch(inputId)
// ---------------------------------------------------------------------------

/**
 * Clear the search input value programmatically.
 *
 * @param {string} inputId
 */
export function clearSearch(inputId) {
  const input = document.getElementById(inputId);
  if (input) input.value = '';
}