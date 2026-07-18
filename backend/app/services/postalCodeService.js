/**
 * postalCodeService.js — Best-effort ZIP/postal code lookup by province +
 * city/municipality name, for the registration form's address block.
 *
 * NOT sourced from PSGC. Philippine ZIP codes are a separate PHLPost
 * system with no official structured dataset — confirmed via a public FOI
 * request (see conversation notes): PHLPost's response to a request for
 * barangay-to-ZIP mapping pointed to a static 2019 PDF, not a dataset.
 * This uses `use-postal-ph`, an unofficial but actively maintained package
 * (MIT, zero deps, verified this session: 2,139 rows, last published ~4
 * months prior to this build).
 *
 * Verified this session, not assumed: outside Metro Manila (NCR), the
 * data is one row per city/municipality — a clean match, and this covers
 * the project's actual PRC Batangas Chapter userbase well (checked
 * Batangas specifically: 35 municipality rows, each with a single
 * post_code). Inside NCR, ZIP codes are split by district/subdivision
 * under each city (e.g. Manila alone has ~19 rows), so a city-name-only
 * match there is unreliable by design of the underlying data, not a bug
 * in this matching logic — accepted limitation given this project's scope.
 *
 * ⚠ This is a SUGGESTION only, never authoritative. Callers (the frontend,
 * via referenceController.js) must keep the ZIP field editable after
 * pre-filling — this service has no way to guarantee a correct match,
 * especially for NCR or ambiguous city names.
 *
 * Path: backend/app/services/postalCodeService.js
 */

const usePostalPH = require('use-postal-ph');

function normalize(str) {
    return (str || '')
        .toLowerCase()
        .replace(/^city of\s+/i, '')
        .replace(/\bcity\b/gi, '')
        .replace(/[.,]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * @param {{ province?: string, municipality: string }} params
 * @returns {{ post_code: number, matched_municipality: string, matched_location: string } | null}
 */
function lookupZip({ province, municipality }) {
    if (!municipality || !municipality.trim()) return null;

    const postalPH = usePostalPH();
    const all = postalPH.fetchDataLists({ limit: 100000 }).data;

    const targetMun  = normalize(municipality);
    const targetProv = normalize(province);

    // Narrow to the same province/location first when we have one — avoids
    // cross-province name collisions (e.g. more than one "San Jose" exists
    // across different provinces).
    const candidates = targetProv
        ? all.filter(r =>
            normalize(r.location) === targetProv || normalize(r.location).includes(targetProv)
          )
        : [];
    const pool = candidates.length > 0 ? candidates : all;

    // Exact normalized match first, then a loose substring fallback.
    let match = pool.find(r => normalize(r.municipality) === targetMun);
    if (!match) {
        match = pool.find(r =>
            normalize(r.municipality).includes(targetMun) || targetMun.includes(normalize(r.municipality))
        );
    }

    if (!match) return null;

    return {
        post_code:             match.post_code,
        matched_municipality:  match.municipality,
        matched_location:      match.location,
    };
}

module.exports = { lookupZip };