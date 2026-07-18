/**
 * fieldGeocodeApi.js — Forward geocoding for the Volunteer/Phlebotomist
 * registration form's address block. Fires silently once Barangay is
 * selected (province + city/municipality + barangay all present), fills
 * the hidden latitude/longitude fields, and never blocks submission if it
 * fails — same "never blocks the flow" precedent as the Submit Request
 * geolocation fallback (see sessionState.md Permanent Rules).
 *
 * Uses the same Nominatim call shape already proven in
 * js/entry/[admin|staff]/bloodDriveCreate.js (format=json, addressdetails,
 * Accept-Language: en) — not importing from that file directly, since
 * import pyramid keeps features/ from reaching into another role's entry
 * file; this is a small, deliberate duplication of a generic external
 * call shape, not a duplicated business rule.
 *
 * Barangay-level precision only — good enough per product decision, and
 * street is deliberately left out of the geocode query since it's raw
 * free text with no validation, which historically returns noisier
 * Nominatim results than a clean administrative-division query.
 *
 * Path: frontend/js/features/registration/fieldGeocodeApi.js
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * @param {{ barangay: string, city: string, province: string }} address
 * @returns {Promise<{ latitude: number, longitude: number } | null>}
 *          null on any failure — caller should treat this as "leave
 *          latitude/longitude empty," never as an error to surface.
 */
export async function geocodeBarangay({ barangay, city, province }) {
  if (!barangay || !city || !province) return null;

  const query = `${barangay}, ${city}, ${province}, Philippines`;

  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;

    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) return null;

    const lat = parseFloat(results[0].lat);
    const lon = parseFloat(results[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

    return { latitude: lat, longitude: lon };
  } catch {
    return null; // silent — registration must still succeed without coords
  }
}