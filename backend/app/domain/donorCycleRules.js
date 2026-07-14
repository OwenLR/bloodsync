/**
 * donorCycleRules.js — Determines whether a donor's most recent walk-in
 * (Staff, non-drive) interview→screening→donation chain is still
 * "in progress," recently deferred (cooldown), or free to restart.
 *
 * Scope: walk-in only. Drive-scoped (Volunteer/Phlebotomist) interviews
 * are already isolated per drive_id via bloodDriveMiddleware and are a
 * separate, already-correct mechanism — not touched by this file.
 */

const { DEFERRAL_COOLDOWN_HOURS } = require('../../constants/deferralRules');

const isDeferredInterview = (result) => {
    if (!result) return false;
    const r = String(result).toLowerCase();
    return r === 'deferred' || r === 'failed';
};

const isDeferredScreening = (result) => {
    if (!result) return false;
    return String(result).toLowerCase() === 'deferred';
};

/**
 * Returns the Date the cooldown expires, or null if it has already expired
 * (i.e. the donor is free now).
 */
const cooldownRetryAt = (sinceDate) => {
    const since   = new Date(sinceDate);
    const retryAt = new Date(since.getTime() + DEFERRAL_COOLDOWN_HOURS * 60 * 60 * 1000);
    return new Date() >= retryAt ? null : retryAt;
};

/**
 * @param {object|null} interview - most recent walk-in donor_interviews row
 * @param {object|null} screening - screening row for that interview_id, if any
 * @param {object|null} donation  - donation row for that screening_id, if any
 *
 * Returns one of:
 *   { state: 'available' }
 *     No history, or the most recent cycle fully completed, or a past
 *     deferral's cooldown has expired. Donor may start a brand new interview.
 *   { state: 'resume_interview', interview }
 *     Interview created but not yet answered.
 *   { state: 'proceed_screening', interview }
 *     Interview passed, no screening yet.
 *   { state: 'proceed_donation', interview, screening }
 *     Screening passed (Eligible), no donation yet.
 *   { state: 'cooldown', retryAt, step }
 *     Deferred/QNS within the last DEFERRAL_COOLDOWN_HOURS.
 *     step is 'interview' | 'screening' | 'donation'.
 */
const computeCycleStatus = ({ interview, screening, donation, collection }) => {
    if (!interview) return { state: 'available' };

    if (interview.interview_result === null || interview.interview_result === undefined) {
        return { state: 'resume_interview', interview };
    }

    if (isDeferredInterview(interview.interview_result)) {
        const retryAt = cooldownRetryAt(interview.created_at);
        return retryAt ? { state: 'cooldown', retryAt, step: 'interview' } : { state: 'available' };
    }

    // Interview passed
    if (!screening) return { state: 'proceed_screening', interview };

    if (isDeferredScreening(screening.screening_result)) {
        const retryAt = cooldownRetryAt(screening.created_at);
        return retryAt ? { state: 'cooldown', retryAt, step: 'screening' } : { state: 'available' };
    }

    // Screening passed (Eligible)
        if (!donation) return { state: 'proceed_donation', interview, screening };

    if (donation.is_qns) {
        const retryAt = cooldownRetryAt(donation.created_at);
        return retryAt ? { state: 'cooldown', retryAt, step: 'donation' } : { state: 'available' };
    }

    // Donation succeeded, but the cycle isn't done until collection is
    // recorded. Without this check, a donor was incorrectly treated as
    // fully cycled — and freed up for a brand new interview — the moment
    // donation succeeded, even with their blood not yet logged into
    // inventory.
    if (!collection) return { state: 'proceed_collection', interview, screening, donation };

    // Full cycle completed successfully — free to start a new interview.
    // (A real PRC inter-donation medical interval is a separate, still-open
    // policy question — not applied here.)
    return { state: 'available' };
};

module.exports = {
    computeCycleStatus,
    isDeferredInterview,
    isDeferredScreening,
    cooldownRetryAt,
};