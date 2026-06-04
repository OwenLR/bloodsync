const validateCreateInterview = (data) => {
    const errors = [];
    const { donor_id, branch_id } = data;

    if (!donor_id) errors.push('donor_id is required');
    if (!branch_id) errors.push('branch_id is required');

    if (donor_id && (isNaN(donor_id) || Number(donor_id) < 1)) {
        errors.push('donor_id must be a positive integer');
    }

    if (branch_id && (isNaN(branch_id) || Number(branch_id) < 1)) {
        errors.push('branch_id must be a positive integer');
    }

    return errors;
};

module.exports = { validateCreateInterview };