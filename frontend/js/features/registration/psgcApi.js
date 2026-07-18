/**
 * psgcApi.js — Philippine Standard Geographic Code (PSGC) lookups for the
 * cascading Province -> City/Municipality -> Barangay address dropdowns on
 * the Volunteer/Phlebotomist registration form.
 *
 * External, unauthenticated public API — NOT our backend, so this uses raw
 * fetch(), never apiFetch() (no cookies, no auth, nothing to refresh).
 * Same reasoning as fieldGeocodeApi.js's Nominatim calls.
 *
 * ⚠ UNVERIFIED AGAINST A LIVE RESPONSE — psgc.gitlab.io's own docs page is
 * JS-rendered and could not be fetched directly to confirm exact field
 * names/paths. Endpoint paths below are built from the API's documented
 * route structure (consistent across multiple independent sources), but
 * the response shape (assumed: array of { code, name } objects) has not
 * been confirmed against a real call. DO ONE LIVE TEST CALL before relying
 * on this in production — same "never assume a field name" caution the
 * project already applies to its own backend (see rules.md).
 *
 * If the real response shape differs, only the three parse* functions
 * below need to change — callers (fieldRegistrationUI.js) only depend on
 * the { code, name } shape returned here, not on PSGC's raw fields.
 *
 * Path: frontend/js/features/registration/psgcApi.js
 */

const PSGC_BASE = 'https://psgc.gitlab.io/api';

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`PSGC request failed (${res.status})`);
  const body = await res.json();
  if (!Array.isArray(body)) throw new Error('Unexpected PSGC response shape');
  return body;
}

// Normalizes a PSGC record to { code, name } regardless of minor field
// naming differences between PSGC API versions/mirrors.
function normalize(record) {
  return {
    code: record.code ?? record.psgc_code ?? record.id ?? '',
    name: record.name ?? record.description ?? '',
  };
}

export async function getProvinces() {
  const rows = await fetchJson(`${PSGC_BASE}/provinces/`);
  return rows.map(normalize).sort((a, b) => a.name.localeCompare(b.name));
}

// Combined cities + municipalities under a province — matches how the
// registration form's single "City / Municipality" dropdown is presented;
// profileModel.js only has one column (address_municipality) for this,
// there's no separate city vs. municipality distinction to preserve.
export async function getCitiesMunicipalities(provinceCode) {
  const rows = await fetchJson(`${PSGC_BASE}/provinces/${provinceCode}/cities-municipalities/`);
  return rows.map(normalize).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getBarangays(cityMunicipalityCode) {
  const rows = await fetchJson(`${PSGC_BASE}/cities-municipalities/${cityMunicipalityCode}/barangays/`);
  return rows.map(normalize).sort((a, b) => a.name.localeCompare(b.name));
}