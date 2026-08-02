/**
 * authBackground.js — Live blood-drop background for the auth pages
 * (login, requestor register, volunteer/phlebotomist register).
 *
 * Uses tsParticles (MIT license), loaded from unpkg as a pinned-version
 * CDN script tag in each page's <head> — see that page's own comment for
 * why (already whitelisted in Helmet's CSP scriptSrc, zero Railway
 * bandwidth since it's served from unpkg's CDN, cached per-device once
 * downloaded since the URL is version-pinned/immutable).
 *
 * This file only configures + starts it. No particle "shapes" beyond
 * plain circles — soft red bokeh drifting upward, meant to read as
 * "blood drops rising" without needing a custom image asset.
 *
 * Purely decorative: interactivity (click/hover) is off, and the canvas
 * sits behind the card with pointer-events disabled via CSS, so it never
 * competes with form interaction.
 *
 * Respects prefers-reduced-motion — skips the animation entirely for
 * anyone who has that OS/browser setting on.
 *
 * Fails silently if the CDN script didn't load (e.g. blocked by an
 * extension, offline dev environment) — the background is decorative,
 * never load-bearing, so a missing tsParticles global should never break
 * the actual login/register form.
 */

function initAuthBackground() {
  const container = document.getElementById('auth-bg');
  if (!container) return;

  if (typeof window.tsParticles === 'undefined') {
    // CDN script didn't load — leave the plain background, no error shown.
    return;
  }

  const prefersReducedMotion = window.matchMedia?.(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if (prefersReducedMotion) return;

  const isSmallScreen = window.innerWidth < 768;

  window.tsParticles.load({
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
          value: isSmallScreen ? 14 : 30,
        },
        color: {
          value: ['#C0392B', '#D9776D', '#E9A6A0'],
        },
        shape: { type: 'circle' },
        opacity: {
          value: { min: 0.06, max: 0.22 },
          animation: { enable: true, speed: 0.4, sync: false },
        },
        size: {
          value: { min: 3, max: 9 },
        },
        move: {
          enable: true,
          direction: 'top',
          speed: { min: 0.3, max: 0.9 },
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