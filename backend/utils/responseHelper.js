const Sentry = require('@sentry/node');

const success = (res, data, message = null, statusCode = 200) => {
    const response = { status: 'success' };
    if (message) response.message = message;
    if (Array.isArray(data)) response.count = data.length;
    response.data = data;
    return res.status(statusCode).json(response);
};

const created = (res, data, message) => {
    return success(res, data, message, 201);
};

const error = (res, message, statusCode = 500) => {
    if (statusCode === 500) {
        Sentry.captureMessage(message, 'error');
    }
    return res.status(statusCode).json({
        status: 'error',
        message
    });
};

const notFound = (res, message = 'Resource not found') => {
    return error(res, message, 404);
};

const badRequest = (res, message) => {
    return error(res, message, 400);
};

const unauthorized = (res, message = 'Unauthorized') => {
    return error(res, message, 401);
};

const forbidden = (res, message = 'Access denied') => {
    return error(res, message, 403);
};

module.exports = {
    success,
    created,
    error,
    notFound,
    badRequest,
    unauthorized,
    forbidden
};