/**
 * medicalRules.js — Frontend mirror of backend/constants/medicalRules.js
 *
 * These are clinical thresholds — do not change here without also
 * changing the backend file, and vice versa. There is no shared build
 * step between frontend and backend in this project, so keeping these
 * two files in sync is a manual discipline, not an automated guarantee.
 * If you ever touch one, touch the other in the same breath.
 */

export const HEMOGLOBIN = {
  MALE: {
    MIN: 13.0,  // g/dL
    MAX: 20.0,  // g/dL
  },
  FEMALE: {
    MIN: 12.5,  // g/dL
    MAX: 20.0,  // g/dL
  },
};

export const EXTRACTION = {
  MAX_DURATION_MINUTES: 15,
};