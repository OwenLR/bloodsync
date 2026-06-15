/**
 * infiniteScroll.js — Infinite scroll component for BloodSync web app.
 *
 * Responsibilities:
 * - initInfiniteScroll()    — observe a sentinel element and trigger loader
 * - destroyInfiniteScroll() — disconnect the observer (on page cleanup)
 *
 * Does NOT:
 * - Fetch any data directly
 * - Know anything about business logic
 * - Render list items
 *
 * Usage:
 *   import { initInfiniteScroll, destroyInfiniteScroll } from '../components/infiniteScroll.js';
 *
 *   let page = 1;
 *
 *   async function loadMore() {
 *     const data = await fetchDonors({ page });
 *     if (!data.hasMore) destroyInfiniteScroll();
 *     renderDonors(data.items);
 *     page++;
 *   }
 *
 *   initInfiniteScroll('scroll-sentinel', loadMore);
 *
 * Requires a sentinel element at the bottom of the list:
 *   <div id="scroll-sentinel"></div>
 */

let _observer = null;
let _loading  = false;

// ---------------------------------------------------------------------------
// initInfiniteScroll(sentinelId, onLoadMore)
// ---------------------------------------------------------------------------

/**
 * @param {string}   sentinelId  — ID of the sentinel element at list bottom
 * @param {function} onLoadMore  — async function called when sentinel is visible
 */
export function initInfiniteScroll(sentinelId, onLoadMore) {
  const sentinel = document.getElementById(sentinelId);
  if (!sentinel) return;

  // Disconnect any existing observer before creating a new one
  destroyInfiniteScroll();

  _observer = new IntersectionObserver(async (entries) => {
    const entry = entries[0];

    if (!entry.isIntersecting || _loading) return;

    _loading = true;

    try {
      await onLoadMore();
    } finally {
      _loading = false;
    }
  }, {
    root:       null,   // viewport
    rootMargin: '0px',
    threshold:  0.1,    // trigger when 10% of sentinel is visible
  });

  _observer.observe(sentinel);
}

// ---------------------------------------------------------------------------
// destroyInfiniteScroll()
// ---------------------------------------------------------------------------

/**
 * Disconnect the IntersectionObserver.
 * Call when all pages are loaded or when navigating away.
 */
export function destroyInfiniteScroll() {
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }

  _loading = false;
}