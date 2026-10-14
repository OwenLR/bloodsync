/**
 * donorService.js — Donor registration business logic.
 */

const donorModel    = require('../repositories/donorModel');
const BusinessError = require('../../utils/businessError');
const ROLES         = require('../../constants/roles');

const MIN_SIMILAR_QUERY_LENGTH   = 3;
const MIN_OVERRIDE_REASON_LENGTH = 5;

const normalizeContact = (contact) => {
    if (!contact) return null;
    return contact.toString().replace(/\D/g, '');
};

// lowercase, trim, collapse inner whitespace (used for exact name matching)
const normalizeNamePart = (value) =>
    (value || '').toString().trim().replace(/\s+/g, ' ').toLowerCase();

// lowercase, strip accents, collapse whitespace (used for fuzzy search queries)
const normalizeName = (value) =>
    value.toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Fuzzy "did you mean" lookup. Suggestion only — never blocks registration.
 * Queries shorter than 3 characters return [] (too noisy for matching).
 * Capped at 100 chars: Postgres levenshtein() rejects strings over 255.
 */
const findSimilarDonors = async (rawKeyword) => {
    const keyword = normalizeName(rawKeyword).slice(0, 100);
    if (keyword.length < MIN_SIMILAR_QUERY_LENGTH) return [];
    return donorModel.searchSimilarDonors(keyword);
};

/**
 * Register a new donor.
 *
 * Hard duplicate rules (each returns 409):
 *   - same government ID
 *   - same first name + last name + birthdate (case/whitespace-insensitive)
 *   - same email
 *   - same contact number
 *
 * Only the name + birthdate rule can be overridden, and only by PRC Staff,
 * who must send duplicate_override: true AND a written override_reason.
 * Volunteers/Phlebotomists/Admin can never override. The ID, email and
 * contact rules are never overridable.
 *
 * @param {object} data             request body
 * @param {number} registeredBy     user_id from the JWT
 * @param {number} registeredByRole role_id from the JWT
 */
const createDonor = async (data, registeredBy, registeredByRole) => {
    const idType   = data.national_id_type || data.id_type;
    const idNumber = data.national_id_number || data.id_number;

    if (idNumber) {
        const existing = await donorModel.getDonorByNationalId(idType, idNumber);
        if (existing) {
            throw new BusinessError('A donor with this government ID is already registered.', 409);
        }
    }

    // ── Name + birthdate duplicate (bloodsync.md #14) ───────────────────
    let overrideReason = null;

    if (data.first_name && data.last_name && data.birthdate) {
        const existingByName = await donorModel.getDonorByNameAndBirthdate(
            normalizeNamePart(data.first_name),
            normalizeNamePart(data.last_name),
            String(data.birthdate).slice(0, 10)
        );

        if (existingByName) {
            const wantsOverride =
                data.duplicate_override === true || data.duplicate_override === 'true';

            if (!wantsOverride) {
                throw new BusinessError(
                    'A donor with the same name and birthdate is already registered.',
                    409
                );
            }

            if (registeredByRole !== ROLES.PRC_STAFF) {
                throw new BusinessError(
                    'Only PRC Staff can register a donor with the same name and birthdate as an existing donor.',
                    403
                );
            }

            const reason = (data.override_reason || '').toString().trim();
            if (reason.length < MIN_OVERRIDE_REASON_LENGTH) {
                throw new BusinessError(
                    'A reason is required to register a donor with the same name and birthdate as an existing donor.',
                    400
                );
            }

            overrideReason = reason;
        }
    }

    if (data.email) {
        const existingByEmail = await donorModel.getDonorByEmail(data.email);
        if (existingByEmail) {
            throw new BusinessError('A donor with this email address is already registered.', 409);
        }
    }

    const normalizedContact = normalizeContact(data.contact);
    if (normalizedContact) {
        const existingByContact = await donorModel.getDonorByContact(normalizedContact);
        if (existingByContact) {
            throw new BusinessError('A donor with this contact number is already registered.', 409);
        }
    }

    const donor = await donorModel.createDonor({
        ...data,
        contact: normalizedContact || data.contact,
        national_id_type: idType,
        national_id_number: idNumber,
        registered_by: registeredBy,
    });

    // Record why the duplicate was allowed. Best-effort follow-up write:
    // the donor row already exists, so a failure here must not fail the
    // registration itself.
    if (overrideReason) {
        try {
            await donorModel.setDuplicateOverrideReason(donor.donor_id, overrideReason);
        } catch (err) {
            console.error('Failed to save duplicate override reason:', err.message);
        }
    }

    return { donor, isExisting: false };
};

module.exports = { createDonor, findSimilarDonors };