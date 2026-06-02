const VALID_BLOOD_TYPES = require('../constants/bloodTypes');
const { SCREENING_RESULTS, HEMOGLOBIN_STATUSES } = require('../constants/statuses');

const validateCreateScreening = (data) => {
    const errors = [];
    const {
        donor_id, hemoglobin,
        screening_result, blood_type_confirmed,
        hemoglobin_status
    } = data;

    if (!donor_id) errors.push('donor_id is required');
    if (!hemoglobin) errors.push('hemoglobin is required');
    if (!screening_result) errors.push('screening_result is required');

    if (blood_type_confirmed &&
        !VALID_BLOOD_TYPES.includes(blood_type_confirmed)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
    }

    if (screening_result &&
        !SCREENING_RESULTS.includes(screening_result)) {
        errors.push('screening_result must be Eligible or Deferred');
    }

    if (hemoglobin_status &&
        !HEMOGLOBIN_STATUSES.includes(hemoglobin_status)) {
        errors.push('hemoglobin_status must be Allowed or Not Allowed');
    }

    return errors;
};

const validateUpdateScreening = (data) => {
    const errors = [];
    const { blood_type_confirmed, screening_result, hemoglobin_status } = data;

    if (Object.keys(data).length === 0) {
        errors.push('At least one field required to update');
    }

    if (blood_type_confirmed &&
        !VALID_BLOOD_TYPES.includes(blood_type_confirmed)) {
        errors.push(`Invalid blood type. Must be one of: ${VALID_BLOOD_TYPES.join(', ')}`);
    }

    if (screening_result &&
        !SCREENING_RESULTS.includes(screening_result)) {
        errors.push('screening_result must be Eligible or Deferred');
    }

    if (hemoglobin_status &&
        !HEMOGLOBIN_STATUSES.includes(hemoglobin_status)) {
        errors.push('hemoglobin_status must be Allowed or Not Allowed');
    }

    return errors;
};

module.exports = {
    validateCreateScreening,
    validateUpdateScreening
};