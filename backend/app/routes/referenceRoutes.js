/**
 * referenceRoutes.js — Small standalone public reference-data lookups that
 * don't belong under any one domain's own route file. Currently just
 * ZIP/postal code lookup (GET /api/reference/zip-lookup), used by the
 * public Volunteer/Phlebotomist registration form's address block.
 *
 * PUBLIC — same trust level as registrationRoutes.js's self-registration
 * endpoints (no verifyToken/checkRole — this runs pre-auth).
 *
 * Path: backend/app/routes/referenceRoutes.js
 */

const express = require('express');
const router  = express.Router();
const referenceController = require('../controllers/referenceController');

router.get('/zip-lookup', referenceController.lookupZip);

module.exports = router;