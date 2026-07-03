// js/features/inventoryCleaning/inventoryCleaningApi.js
//
// Inventory Cleaning shares its data source and single-unit status update
// with Blood Units (Section 2) — same branch-scoped list, same
// PATCH /:id/status endpoint. Per architectural decision (this session):
// import directly from bloodUnitsApi.js rather than duplicating the same
// two apiFetch calls in a second feature folder. Single source of truth
// for those two calls; if Dispose's reason-required behavior ever changes
// on the backend, there's only one place on the frontend that calls it.
//
// bulkDisposeUnits() is the one piece of logic that's actually new here —
// no bulk endpoint exists in the backend (confirmed in contract.md), so
// this loops the same single-unit PATCH per selected unit and reports
// per-unit success/failure, rather than assuming all-or-nothing.

import { BLOOD_UNIT_STATUS } from '../../constants/statusConstants.js';
import {
  getUnitsByBranch,
  updateUnitStatus,
} from '../bloodUnits/bloodUnitsApi.js';

// Re-exported as-is — inventoryCleaningUI.js should only ever import from
// this file, never reach sideways into bloodUnits/bloodUnitsApi.js directly.
// Keeps the feature folder self-contained from the UI layer's perspective,
// even though the Api layer itself borrows from another feature.
export { getUnitsByBranch };

/**
 * Dispose multiple expired units in sequence.
 * Not atomic — a failure on one unit does not stop or roll back the others.
 * Caller (UI layer) is responsible for showing succeeded/failed counts.
 *
 * @param {number[]} unitIds
 * @param {string}   reason  - required by backend for status='Disposed'
 * @returns {Promise<{ succeeded: number[], failed: Array<{ unit_id: number, message: string }> }>}
 */
export async function bulkDisposeUnits(unitIds, reason) {
  const succeeded = [];
  const failed    = [];

  for (const unitId of unitIds) {
    try {
      await updateUnitStatus(unitId, BLOOD_UNIT_STATUS.DISPOSED, reason);
      succeeded.push(unitId);
    } catch (err) {
      failed.push({ unit_id: unitId, message: err.message });
    }
  }

  return { succeeded, failed };
}