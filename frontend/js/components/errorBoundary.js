/**
 * errorBoundary.js — Error boundary component for BloodSync web app.
 *
 * Responsibilities:
 * - showError()   — replace container content with an error message + retry button
 * - clearError()  — remove the error state from a container
 *
 * Prevents blank white sections when a feature fails to load.
 * The retry button re-calls the loader function passed by the caller.
 *
 * Does NOT:
 * - Fetch any data
 * - Know anything about business logic
 *
 * Usage:
 *   import { showErrorBoundary, clearErrorBoundary } from '../components/errorBoundary.js';
 *
 *   try {
 *     const data = await loadDonors();
 *     renderDonors(data);
 *   } catch (err) {
 *     showErrorBoundary('donor-list', 'Failed to load donors.', loadDonors);
 *   }
 */

// ---------------------------------------------------------------------------
// showErrorBoundary(containerId, message, onRetry)
// ---------------------------------------------------------------------------

/**
 * Replace container content with an error state.
 *
 * @param {string}   containerId — ID of the container to show error in
 * @param {string}   message     — human-readable error description
 * @param {function} [onRetry]   — function to call when retry is clicked
 */
export function showErrorBoundary(containerId, message, onRetry = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const wrapper     = document.createElement('div');
  wrapper.className = 'error-boundary';

  const icon       = document.createElement('span');
  icon.className   = 'error-boundary-icon';
  icon.textContent = '⚠';
  icon.setAttribute('aria-hidden', 'true');

  const text       = document.createElement('p');
  text.className   = 'error-boundary-message';
  text.textContent = message || 'Something went wrong. Please try again.';

  wrapper.appendChild(icon);
  wrapper.appendChild(text);

  if (onRetry) {
    const retryBtn       = document.createElement('button');
    retryBtn.className   = 'btn-retry';
    retryBtn.textContent = 'Try Again';
    retryBtn.addEventListener('click', async () => {
      clearErrorBoundary(containerId);
      await onRetry();
    });

    wrapper.appendChild(retryBtn);
  }

  container.appendChild(wrapper);
}

// ---------------------------------------------------------------------------
// clearErrorBoundary(containerId)
// ---------------------------------------------------------------------------

/**
 * Remove the error state from a container.
 * The caller is responsible for rendering real content afterward.
 *
 * @param {string} containerId
 */
export function clearErrorBoundary(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const boundary = container.querySelector('.error-boundary');
  if (boundary) boundary.remove();
}