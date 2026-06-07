/**
 * interviewQuestionValidator.js — Technical input validation for
 * interview question routes.
 * Business rules do not belong here.
 */

const VALID_SEX_FILTERS = ['Male', 'Female', 'Both'];

/**
 * Validate and normalise the sex parameter from a route param.
 * Returns { sex, errors } — sex is the normalised value if valid.
 *
 * @param {string} rawSex - Raw value from req.params.sex
 * @returns {{ sex: string, errors: string[] }}
 */
const validateSexParam = (rawSex) => {
    const errors = [];

    if (!rawSex) {
        errors.push('sex parameter is required');
        return { sex: null, errors };
    }

    // Normalise capitalisation: "male" → "Male"
    const sex =
        rawSex.charAt(0).toUpperCase() + rawSex.slice(1).toLowerCase();

    if (!['Male', 'Female'].includes(sex)) {
        errors.push('sex must be Male or Female');
        return { sex: null, errors };
    }

    return { sex, errors };
};

const validateUpdateQuestion = (data) => {
    const errors = [];

    if (Object.keys(data).length === 0) {
        errors.push('At least one field is required to update');
    }

    if (
        data.sex_filter &&
        !VALID_SEX_FILTERS.includes(data.sex_filter)
    ) {
        errors.push(
            `sex_filter must be one of: ${VALID_SEX_FILTERS.join(', ')}`
        );
    }

    if (data.defer_if && !['YES', 'NO'].includes(data.defer_if)) {
        errors.push('defer_if must be YES or NO');
    }

    return errors;
};

module.exports = {
    validateSexParam,
    validateUpdateQuestion,
};