/**
 * Deferral cooldown — how long a donor stays blocked from restarting the
 * walk-in workflow (Staff, non-drive) after being deferred/failed at any
 * step: interview deferred, screening deferred, or donation QNS.
 *
 * Temporary policy value per current direction — adjust here only,
 * nowhere else. Mirrored on the frontend at js/constants/deferralRules.js —
 * see that file's header for the manual-sync discipline note (same as
 * medicalRules.js).
 */
const DEFERRAL_COOLDOWN_HOURS = 24; // 1 day, temporary policy

module.exports = { DEFERRAL_COOLDOWN_HOURS };