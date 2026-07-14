/**
 * responseHelper.js — Standardized API response formatting.
 *
 * All controllers use these helpers — never write res.status().json() directly.
 * error() captures to GlitchTip only on 500s.
 *
 * handleError() is the unified catch handler for controllers.
 * It distinguishes BusinessError (known, expected) from plain Error (unexpected 500).
 */

const Sentry      = require('@sentry/node');
const BusinessError = require('./businessError');

const success = (res, data, message = null, statusCode = 200) => {
    const response = { success: true };
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
        success: false,
        message,
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

/**
 * Unified catch block handler for controllers.
 *
 * BusinessError  → respond with error.statusCode (400/401/403/404)
 * plain Error    → respond with 500, captured by GlitchTip
 *
 * Usage:
 *   } catch (err) {
 *       return response.handleError(res, err);
 *   }
 */
const handleError = (res, err) => {
    if (err instanceof BusinessError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
    }
    console.error(err); // TEMP — surfaces full stack + pg error detail for debugging
    return error(res, err.message);
};

module.exports = {
    success,
    created,
    error,
    notFound,
    badRequest,
    unauthorized,
    forbidden,
    handleError,
};