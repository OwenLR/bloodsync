/**
 * donorService.js — Donor registration business logic.
 */

const donorModel    = require('../repositories/donorModel');
const BusinessError = require('../../utils/businessError');

const createDonor = async (data, registeredBy) => {
    if (data.national_id_type && data.national_id_number) {
        const existing = await donorModel.getDonorByNationalId(
            data.national_id_type,
            data.national_id_number
        );
        if (existing) {
            return { donor: existing, isExisting: true };
        }
    }

    const donor = await donorModel.createDonor({
        ...data,
        registered_by: registeredBy,
    });

    return { donor, isExisting: false };
};

module.exports = { createDonor };