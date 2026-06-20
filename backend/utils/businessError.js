/**
 * BusinessError.js — Custom error class for known business rule violations.
 *
 * Services and domain functions throw BusinessError for intentional,
 * expected failures (bad credentials, rule violations, not found, etc.).
 *
 * Controllers catch it and return the appropriate HTTP status code.
 * Plain Error is reserved for unexpected infrastructure failures (DB down,
 * JWT misconfigured, etc.) — those become 500s and are captured by GlitchTip.
 *
 * Usage in services/domain:
 *   throw new BusinessError('Donor has an active deferral');         // 400
 *   throw new BusinessError('Invalid email or password', 401);       // 401
 *   throw new BusinessError('Access denied', 403);                   // 403
 *   throw new BusinessError('Blood drive not found', 404);           // 404
 *
 * Usage in controllers:
 *   Always use response.handleError(res, error) in the catch block —
 *   never classify BusinessError vs plain Error manually in a controller,
 *   and never call response.error(res, error.message) directly in a catch
 *   block (it silently forces statusCode 500 for every error, including
 *   ones that should be 400/403/404, and spams GlitchTip with expected,
 *   non-infrastructure failures).
 *
 *   } catch (error) {
 *       return response.handleError(res, error);
 *   }
 *
 *   handleError() does the BusinessError-vs-plain-Error classification for
 *   you — see responseHelper.js for the implementation.
 */

class BusinessError extends Error {
    /**
     * @param {string} message    - Human-readable error description
     * @param {number} statusCode - HTTP status code (default: 400)
     */
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'BusinessError';
        this.statusCode = statusCode;
    }
}

module.exports = BusinessError;