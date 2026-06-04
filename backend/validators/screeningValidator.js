const VALID_BLOOD_TYPES = require('../constants/bloodTypes');
const { SCREENING_RESULTS, HEMOGLOBIN_STATUSES } = require('../constants/statuses');

const validateCreateScreening = (data) => {
    const errors = [];
    const {
        donor_id, weight, hemoglobin, pulse_rate,
        blood_pressure, screening_result,
        blood_type_confirmed, hemoglobin_status
    } = data;

    if (!donor_id) errors.push('donor_id is required');
    if (!hemoglobin) errors.push('hemoglobin is required');
    if (!screening_result) errors.push('screening_result is required');

    if (weight !== undefined && weight !== null && weight !== '') {
        if (isNaN(weight) || Number(weight) <= 0) {
            errors.push('weight must be a positive number');
        }
    }

    if (hemoglobin !== undefined && hemoglobin !== null && hemoglobin !== '') {
        if (isNaN(hemoglobin) || Number(hemoglobin) <= 0) {
            errors.push('hemoglobin must be a positive number');
        }
    }

    if (pulse_rate !== undefined && pulse_rate !== null && pulse_rate !== '') {
        if (!Number.isInteger(Number(pulse_rate)) || Number(pulse_rate) <= 0) {
            errors.push('pulse_rate must be a positive integer');
        }
    }

    if (blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(blood_pressure)) {
        errors.push('blood_pressure format must be like 120/80');
    }

    if (blood_type_confirmed && !VALID_BLOOD_TYPES.includes(blood_type_confirmed)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
    }

    if (screening_result && !SCREENING_RESULTS.includes(screening_result)) {
        errors.push('screening_result must be Eligible or Deferred');
    }

    if (hemoglobin_status && !HEMOGLOBIN_STATUSES.includes(hemoglobin_status)) {
        errors.push('hemoglobin_status must be Allowed or Not Allowed');
    }

    return errors;
};

const validateUpdateScreening = (data) => {
    const errors = [];
    const {
        weight, hemoglobin, pulse_rate,
        blood_pressure, blood_type_confirmed,
        screening_result, hemoglobin_status
    } = data;

    if (Object.keys(data).length === 0) {
        errors.push('At least one field required to update');
    }

    if (weight !== undefined && weight !== null && weight !== '') {
        if (isNaN(weight) || Number(weight) <= 0) {
            errors.push('weight must be a positive number');
        }
    }

    if (hemoglobin !== undefined && hemoglobin !== null && hemoglobin !== '') {
        if (isNaN(hemoglobin) || Number(hemoglobin) <= 0) {
            errors.push('hemoglobin must be a positive number');
        }
    }

    if (pulse_rate !== undefined && pulse_rate !== null && pulse_rate !== '') {
        if (!Number.isInteger(Number(pulse_rate)) || Number(pulse_rate) <= 0) {
            errors.push('pulse_rate must be a positive integer');
        }
    }

    if (blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(blood_pressure)) {
        errors.push('blood_pressure format must be like 120/80');
    }

    if (blood_type_confirmed && !VALID_BLOOD_TYPES.includes(blood_type_confirmed)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
    }

    if (screening_result && !SCREENING_RESULTS.includes(screening_result)) {
        errors.push('screening_result must be Eligible or Deferred');
    }

    if (hemoglobin_status && !HEMOGLOBIN_STATUSES.includes(hemoglobin_status)) {
        errors.push('hemoglobin_status must be Allowed or Not Allowed');
    }

    return errors;
};

module.exports = {
    validateCreateScreening,
    validateUpdateScreening
};