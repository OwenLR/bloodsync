/**
 * donorCycleStatus.js — Frontend mirror of backend/app/domain/donorCycleRules.js
 *
 * Derives per-donor walk-in (Staff, non-drive) cycle state from
 * bulk-fetched interview/screening/donation lists, without an N+1 API
 * call per donor in a dropdown. Must be kept in sync with the backend
 * file — same manual-sync discipline as medicalRules.js / deferralRules.js.
 *
 * Volunteer/Phlebotomist (drive-scoped) flows do NOT use this — those
 * stay isolated per drive_id via existing dropdown filtering, untouched.
 */

import { DEFERRAL_COOLDOWN_HOURS } from '../../constants/deferralRules.js';

function _isDeferredInterview(result) {
  if (!result) return false;
  const r = String(result).toLowerCase();
  return r === 'deferred' || r === 'failed';
}

function _isDeferredScreening(result) {
  if (!result) return false;
  return String(result).toLowerCase() === 'deferred';
}

function _cooldownRetryAt(sinceDate) {
  const since   = new Date(sinceDate);
  const retryAt = new Date(since.getTime() + DEFERRAL_COOLDOWN_HOURS * 60 * 60 * 1000);
  return new Date() >= retryAt ? null : retryAt;
}

/** Same return shape as the backend's computeCycleStatus. */
export function computeWalkInCycleStatus({ interview, screening, donation, collection }) {
  if (!interview) return { state: 'available' };

  if (interview.interview_result === null || interview.interview_result === undefined) {
    return { state: 'resume_interview', interview };
  }

  if (_isDeferredInterview(interview.interview_result)) {
    const retryAt = _cooldownRetryAt(interview.created_at);
    return retryAt ? { state: 'cooldown', retryAt, step: 'interview' } : { state: 'available' };
  }

  if (!screening) return { state: 'proceed_screening', interview };

  if (_isDeferredScreening(screening.screening_result)) {
    const retryAt = _cooldownRetryAt(screening.created_at);
    return retryAt ? { state: 'cooldown', retryAt, step: 'screening' } : { state: 'available' };
  }

  if (!donation) return { state: 'proceed_donation', interview, screening };

  if (donation.is_qns) {
    const retryAt = _cooldownRetryAt(donation.created_at);
    return retryAt ? { state: 'cooldown', retryAt, step: 'donation' } : { state: 'available' };
  }

  if (!collection) return { state: 'proceed_collection', interview, screening, donation };

  return { state: 'available' };
}

/** donor_id -> most recent WALK-IN interview (drive_id null). */
export function buildLatestWalkInInterviewMap(allInterviews) {
  const map = new Map();
  allInterviews
    .filter(iv => iv.drive_id === null || iv.drive_id === undefined)
    .forEach(iv => {
      const existing = map.get(iv.donor_id);
      if (!existing || iv.interview_id > existing.interview_id) {
        map.set(iv.donor_id, iv);
      }
    });
  return map;
}

/** interview_id -> its screening (screenings are 1:1 with interview_id). */
export function buildLatestScreeningByInterviewMap(allScreenings) {
  const map = new Map();
  allScreenings.forEach(s => {
    if (s.interview_id == null) return;
    const existing = map.get(s.interview_id);
    if (!existing || s.screening_id > existing.screening_id) {
      map.set(s.interview_id, s);
    }
  });
  return map;
}

/** screening_id -> its donation (donations are 1:1 with screening_id). */
export function buildDonationByScreeningMap(allDonations) {
  const map = new Map();
  allDonations.forEach(dn => {
    if (dn.screening_id == null) return;
    map.set(dn.screening_id, dn);
  });
  return map;
}

/** donation_id -> its collection (collections are 1:1 with donation_id
    for the donation-flow case — separation-derived collections have
    donation_id copied from the source unit and aren't relevant here). */
export function buildCollectionByDonationMap(allCollections) {
  const map = new Map();
  allCollections.forEach(c => {
    if (c.donation_id == null) return;
    map.set(c.donation_id, c);
  });
  return map;
}