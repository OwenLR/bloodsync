/**
 * authBackground.js — Live "inside a blood vessel" background for the
 * auth pages (login, requestor register, volunteer/phlebotomist register).
 *
 * Uses tsParticles (MIT license), loaded from unpkg as pinned-version
 * CDN script tags in each page's <head> — see that page's own comment
 * for why (already whitelisted in Helmet's CSP scriptSrc).
 *
 * Particles are your uploaded /assets/img/cell.png, rendered fewer and
 * larger than a typical particle background — meant to read as "zoomed
 * in, inside a vessel" rather than a sprinkle of distant dots. The dark
 * red vessel-interior backdrop itself is a CSS gradient on <body>, see
 * login.css. cell.png is same-origin (served via express.static under
 * /assets), already covered by Helmet's imgSrc 'self' — no CSP change.
 *
 * Purely decorative: interactivity off, canvas sits behind the card with
 * pointer-events disabled via CSS, never competes with form interaction.
 * Respects prefers-reduced-motion. Fails silently if the CDN script(s)
 * or the image don't load — never blocks the actual login/register form.
 */

const CELL_IMAGE_SRC = '/assets/img/cell.png';
// Adjust to cell.png's actual pixel dimensions if it isn't square —
// this is just tsParticles' aspect-ratio reference, not display size
// (display size is controlled by particles.size below).
const CELL_IMAGE_WIDTH = 200;
const CELL_IMAGE_HEIGHT = 200;

async function initAuthBackground() {
  const container = document.getElementById('auth-bg');
  if (!container) return;

  if (typeof window.tsParticles === 'undefined' || typeof window.loadSlim === 'undefined') {
    // CDN script(s) didn't load — leave the plain background, no error shown.
    return;
  }

  const prefersReducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) return;

  const isSmallScreen = window.innerWidth < 768;

  // Register slim features (shapes incl. image, movers, updaters) on the
  // engine — required before .load() with tsParticles v4's CDN bundle.
  await window.loadSlim(window.tsParticles);

  await window.tsParticles.load({
    id: 'auth-bg',
    options: {
      fullScreen: { enable: false },
      background: { color: { value: 'transparent' } },
      fpsLimit: 45,
      detectRetina: true,
      pauseOnBlur: true,
      pauseOnOutsideViewport: true,
      particles: {
        number: {
          // Fewer, larger cells — a "zoomed in" macro shot has a handful
          // of cells drifting through frame, not dozens of tiny dots.
          value: isSmallScreen ? 6 : 12,
        },
        shape: {
          type: 'image',
          options: {
            image: {
              src: CELL_IMAGE_SRC,
              width: CELL_IMAGE_WIDTH,
              height: CELL_IMAGE_HEIGHT,
            },
          },
        },
        opacity: {
          value: { min: 0.25, max: 0.55 },
          animation: { enable: true, speed: 0.3, sync: false },
        },
        size: {
          value: { min: 45, max: 100 },
        },
        move: {
          enable: true,
          direction: 'right',      // flows along the "vessel", not upward like bubbles
          speed: { min: 0.15, max: 0.4 },
          random: true,
          straight: false,
          outModes: { default: 'out' },
        },
      },
      interactivity: {
        events: {
          onHover: { enable: false },
          onClick: { enable: false },
        },
      },
    },
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuthBackground);
} else {
  initAuthBackground();
}