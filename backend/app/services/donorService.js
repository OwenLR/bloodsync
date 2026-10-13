/**
 * donorService.js — Donor registration business logic.
 */

const donorModel    = require('../repositories/donorModel');
const BusinessError = require('../../utils/businessError');

const normalizeContact = (contact) => {
    if (!contact) return null;
    return contact.toString().replace(/\D/g, '');
};

const createDonor = async (data, registeredBy) => {
    const idType   = data.national_id_type || data.id_type;
    const idNumber = data.national_id_number || data.id_number;

    if (idNumber) {
        const existing = await donorModel.getDonorByNationalId(idType, idNumber);
        if (existing) {
            throw new BusinessError('A donor with this government ID is already registered.', 409);
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

    return { donor, isExisting: false };
};


const MIN_SIMILAR_QUERY_LENGTH = 3;

// lowercase, strip accents from the query, collapse whitespace
const normalizeName = (value) =>
    value.toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Fuzzy "did you mean" lookup. Suggestion only — never blocks registration.
 * Queries shorter than 3 characters return [] (too noisy for trigram matching).
 */
const findSimilarDonors = async (rawKeyword) => {
    const keyword = normalizeName(rawKeyword);
    if (keyword.length < MIN_SIMILAR_QUERY_LENGTH) return [];
    return donorModel.searchSimilarDonors(keyword);
};

module.exports = { createDonor, findSimilarDonors };