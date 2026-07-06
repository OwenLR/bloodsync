import { apiFetch } from '../../core/api.js';

const BASE = '/api/hospitals';

// GET /api/hospitals — hospitalModel.js returns hospital_id, hospital_name, location
export async function getAllHospitals() {
  const res  = await apiFetch(BASE);
  const body = await res.json();
  if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load hospitals.');
  return body.data;
}