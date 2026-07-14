# BloodSync Frontend — Gotchas & Backend Contract Reminders

## Backend Contract — Things That Silently Break the Frontend
1. Drive status — computed server-side from PHT time. Never recompute on frontend.
2. interview_id in answers — NOT screening_id. Backend rejects with 400.
3. drive_id NULL — means Staff walk-in, not a bug. Do not show error.
4. GET /api/blood-drives/confirm — returns HTML, not JSON. Browser link only.
5. role_id 3 (Donor) — never logs in, no frontend page.
6. Vol/Phleb identity fields — locked server-side. Backend rejects with 400.
7. QNS collections (is_qns=true) — cannot be marked Safe. Hide Safe button.
8. FEFO assignment — automatic on Approved. Frontend never controls unit assignment.
9. drive_id — set by bloodDriveMiddleware server-side. Never send in POST body.
10. Sequential medical flow — 400 on a step usually means prior step incomplete.
11. cancelRequest — scoped to user_id + status=Pending. Returns 404 if not Pending.
12. Separated blood unit — terminal. Hide all action buttons.
13. answer values — must be exactly "YES" or "NO" (uppercase). Backend rejects lowercase.
14. Donor email — required at registration AND donation time. Block donation if missing.
15. PRC Staff branch scope — cannot manage other branches. Backend returns 403.
16. Field role 403 on workflow routes — means no active drive, not a role error.
17. Token refresh body.data — is null on web (correct). Do not error on null.
18. Blood request transitions — Pending→Approved/Rejected, Approved→Released/Rejected only.
19. Socket rooms — assigned server-side. Never emit join_room manually.
20. Requestor GET /api/blood-requests — scoped to own requests server-side. No frontend filter.
21. GET /api/auth/me — does a DB lookup to include first_name/last_name. Uses apiFetch.
22. success field — is boolean (true/false). Never check body.status === 'success'.
23. CANCELLED on blood requests — display only. Staff cannot set via status update route.
24. Blood drive fields — DB has more fields than contract originally showed. Verify from model.
25. POST /api/donors — returns 409 on duplicate. Show "search for existing donor" message.
26. Donor email missing — donation step fails with 400. Check before proceeding.
27. PATCH /api/donors/:id/contact — Vol/Phleb only. Sending other fields → 400.
28. PATCH /api/donors/:id — Staff/Admin only. Do not call from Vol/Phleb.
29. drive_id on field ops — set by middleware. 403 = no active drive assignment.
30. phlebotomist_id in POST /api/donations — requires migration:
    ALTER TABLE donations ADD COLUMN phlebotomist_id integer REFERENCES users(user_id);
    donationModel.js + donationService.js updated to accept + validate it.
31. authMiddleware.js response shape — fixed to { success: false }. Was { status: 'error' }.
32. extraction_time field name — service destructures as extraction_time, maps to
    extraction_time_minutes for model. Frontend sends extraction_time (whole minutes only).
    [SUPERSEDED this session — see #63. extraction_time_minutes no longer
    exists; donations now store extraction_time_seconds as the single
    source of truth, sent as a combined minutes+seconds value from the
    frontend. Left here for history, not current behavior.]
33. GET /api/blood-units/branch/:branch_id — previously returned Available + non-expired only
    (getUnitsByBranch had WHERE status='Available' AND expiration_date > NOW() hardcoded).
    Fixed this session: new getUnitsByBranchAll returns ALL statuses. Frontend never calls
    the old getUnitsByBranch path for inventory display — use /branch/:branch_id which now
    routes to getUnitsByBranchAll server-side.
34. GET /api/blood-units + GET /api/blood-units/branch/:branch_id — previously had no branch
    ownership check for PRC Staff. Fixed this session: Staff calling GET / now gets their
    branch only (controller auto-scopes via getUnitsByBranchAll). GET /branch/:branch_id
    now returns 403 if branch_id in URL doesn't match JWT branch_id for Staff.
35. Blood unit status='Expired' — never set by any write operation (no cron, no trigger).
    Fixed this session: ALL three GET query functions (getAllUnits, getUnitsByBranchAll,
    getUnitById) now use SQL CASE WHEN status='Available' AND expiration_date <= NOW()
    THEN 'Expired' ELSE status END. Frontend receives 'Expired' in the status field
    directly — never compute expiry from the date field client-side for display.
36. assertNotTerminal in bloodUnitRules.js — previously only checked the status column,
    meaning an Available unit past expiration_date could still accept PATCH /status.
    Fixed this session: now also throws if expiration_date <= now(), regardless of
    stored status string. Backend is the enforcer — frontend hides buttons based on
    the status string returned by the API (which is now correct per fix #35 above).
37. getUnitsByBranchAll response fields (list view): unit_id, blood_type, component,
    volume_ml, barcode, collection_date, expiration_date, status, disposal_reason,
    withdrawal_reason, created_at, donor_id, first_name, last_name.
    getUnitById response (detail): all of the above plus collection_id, donation_id,
    branch_id, drive_id, branch_name, processed_at, processed_by_first, processed_by_last.
38. near_expiry field — added this session to getAllUnits, getUnitById, and
    getUnitsByBranchAll (blood unit GET responses, list + detail). Boolean,
    computed server-side via SQL CASE using per-component thresholds from
    constants/inventoryRulesConstant.js (NEAR_EXPIRY_DAYS). True only when
    status is Available and not yet expired. Frontend reads this boolean
    directly — never computes date math for near-expiry classification,
    same pattern as fix #35's Expired computation. NOT added to
    getUnitsByBranch (FEFO-only, no display use case).
39. cacheService.js cache() middleware was checking stale body.status === 'success'
    (pre-fix #22/#31 response shape) instead of body.success === true. Fixed this
    session. Cache writes were silently inert everywhere cache() was applied —
    condition never matched, so no broken responses ever reached the frontend, but
    caching itself never worked. Cache-hit response shape also fixed to exactly
    match responseHelper.success() (including count for array data).
40. bloodUnitService.js updateUnitStatus() and separateUnit() were NOT invalidating
    cache:blood-units:availability or cache:blood-units:inventory on mutation —
    only bloodCollectionService.js's markAsSafe() (unit creation) invalidated these
    keys. Fixed this session (Blood Separation build): both functions now call
    invalidateCache() for both keys after their mutation succeeds (after COMMIT,
    in separateUnit's case, so a rolled-back transaction never invalidates). Prior
    to this fix, disposing/withdrawing/separating a unit could leave the
    /availability and /inventory endpoints serving stale data for up to 60s.
41. blood_collections.source_unit_id — nullable column, set only on collections
    created via POST /api/blood-units/:id/separate (createDerivedCollections in
    bloodCollectionModel.js). Links a derived collection back to the whole blood
    unit it came from. NULL for normal donation-flow collections. Was present in
    the model/DB before this session but undocumented in contract.md — added
    this session when building Blood Separation (Section 4).
42. GET /api/blood-requests, GET /api/blood-requests/:id, PATCH
    /api/blood-requests/:id/status, PATCH /api/blood-requests/:id/ready —
    previously had no branch ownership check for PRC Staff (same bug class as
    fix #34 for Blood Units). Fixed this session: bloodRequestModel.js gained
    getRequestsByBranch(branchId); bloodRequestController.js now checks
    req.user.role_id === PRC_STAFF and compares branch_id before allowing
    getAllRequests (scopes to branch instead of erroring), getRequestById,
    updateRequestStatus, and markReadyForPickup (403 if branch mismatch on the
    latter three). Admin unaffected — still sees/manages all branches. Backend
    approveRequest's FEFO reservation logic already correctly used
    request.branch_id internally; this fix stops a Staff user from reaching
    that logic for a request that isn't theirs in the first place.
43. Blood Request status is NOT what contract.md previously documented
    (Pending/Approved/Released/Rejected/Cancelled with no Waiting state).
    Actual transitions, per bloodRequestRules.js VALID_TRANSITIONS:
    Pending → Approved | Rejected; Approved → Waiting | Rejected;
    Waiting → Released | Rejected. Cancelled is reachable ONLY via
    PATCH /:id/cancel (Requestor, Pending-only, direct DB update) — it is
    NOT part of VALID_TRANSITIONS and cannot be reached through
    PATCH /:id/status. Contract.md has been corrected to match — see its
    Blood Request Endpoints section for the full up-to-date shape (item
    field names, reservations, status logs, all 5 requestor/staff routes).
44. Blood request notifications (notificationService.notifyRequestStatusChange)
    fire on Approved, Waiting, Released, and Rejected transitions made through
    the service layer — but NOT on cancelRequest (Requestor self-cancel) or
    markReceived (Requestor confirms receipt). Frontend should not expect a
    socket event (blood_request_status) or a new notification row after those
    two specific actions — update the UI optimistically from the API response
    instead of waiting on a socket confirmation for them.
45. createRequest does NOT auto-compute branch_id — the requestor-supplied
    branch_id from the request body is used as-is (bloodRequestService.js).
    The nearest-branch/split-fulfillment logic bloodsync.md describes (items
    9–17) lives entirely in fulfillmentService.getFulfillmentOptions(), which
    is a separate pre-submission step (POST /fulfillment-options) — the
    frontend must call that first, let the requestor pick a branch from the
    result, then submit that chosen branch_id with the actual POST /
    request. Do not assume the backend will pick a branch automatically at
    submit time.
46. preferred_branch_id (blood_requests column) — intentionally never sent by
    the frontend as of the Submit Request build. It predates the two-step
    fulfillment-options flow (see #45) and is fully superseded by branch_id,
    which now carries the requestor's actual chosen branch. Column stays
    nullable in the DB (harmless), but no frontend field maps to it and no
    backend logic reads it. Do not resurrect a form field for this without
    a clear new purpose.
47. POST /api/blood-requests previously allowed submission with no request
    form file — bloodRequestController.js's createRequest() only called
    uploadToCloudinary if req.file existed, otherwise silently stored
    request_form_path: null. Fixed this session (Submit Request build):
    added validateRequestFormFile() to bloodRequestValidator.js, called
    in the controller before upload — 400 if no file attached. Matches
    bloodsync.md #18 ("the blood request form is required for submission").
48. roleMiddleware.js checkRole() — was still using the old {status:'error'}
    response shape (same anti-pattern fixed in authMiddleware.js per #31).
    Fixed this session: now uses response.forbidden() for a proper
    {success:false, message} 403. Frontend code checking body.success will
    now correctly treat role-rejections as thrown Errors instead of
    getting an undefined success field.
49. bloodRequestValidator.js validateItems(items, errors) — mutates the
    passed-in errors array via push() but had no return statement,
    implicitly returning undefined on both exit paths. Harmless for
    validateFulfillmentOptions/validateCreateRequest (they declare their
    own local array and read that afterward, ignoring the return value)
    but fulfillmentService.js's getFulfillmentOptions() uses the OTHER
    documented pattern (const errors = validateItems(items, [])) and reads
    the return value directly — crashed with "Cannot read properties of
    undefined (reading 'length')" on every call, 500, regardless of
    items validity. Fixed this session: validateItems now returns errors
    on both paths. First surfaced when the Submit Request fulfillment-
    options step was exercised end-to-end for the first time.
50. bloodRequestService.js's status-mutation functions do NOT return a
    consistent response shape across all four transitions:
    - approveRequest() → { request: {...}, reservations: [...] } (nested)
    - markReadyForPickup() → raw blood_requests row (RETURNING * from
      updateRequestStatus model call, no nesting)
    - releaseRequest() → raw blood_requests row (same, flat)
    - rejectRequest() → raw blood_requests row (same, flat)
    All four are reachable through the single PATCH /:id/status endpoint
    (except markReadyForPickup, which has its own /:id/ready route) via
    bloodRequestController.js's updateRequestStatus handler, which just
    passes through whatever bloodRequestService.updateStatus() returns.
    Frontend impact: don't try to branch on "is there a .request key or
    not" to unwrap the response — for a single-item detail view, simplest
    fix is to ignore the mutation response entirely and refetch via
    GET /:id after any successful action (see bloodRequestDetailUI.js,
    built this session, and the Permanent Rules note in sessionState.md).
51. bloodRequestModel.js's getStatusLogsByRequest() and
    getReservationsByRequest() do not join user names onto
    changed_by_id/reserved_by — only changed_by_type ('staff'/'requestor')
    is available for display on a status log entry, not which specific
    staff member acted. Same for reservations' reserved_by (raw user_id,
    no join). Frontend (Blood Requests Detail page, this session) can
    only show "by Staff" / "by Requestor", not a name. Would need a model
    join added if per-person attribution is ever needed on these two
    endpoints.
52. No `frame-src` CSP directive exists in server.js's Helmet config —
    falls back to `default-src 'self'` per the CSP spec. This silently
    blocks any <iframe>/<embed> pointed at an external origin (e.g. a
    Cloudinary-hosted PDF), even though imgSrc already allowlists
    res.cloudinary.com for <img> tags. Discovered while building the
    Blood Requests Detail page's document viewer (this session) — worked
    around by using a plain new-tab link instead of an inline embed (see
    sessionState.md Permanent Rules). Not a bug — just a gap that would
    need a deliberate CSP addition if inline preview is ever wanted.
53. donationModel.js's getAllDonations/getDonationById/getDonationsByDonor —
    none of the three SELECTed dn.branch_id or dn.drive_id (only b.branch_name
    via the join). Fixed this session: added both columns to all three
    queries. Root cause of #54 below — donationModel.getDonationById() is
    what bloodCollectionService.createCollection() reads to build a new
    collection's branch_id/drive_id; since those fields were never in the
    returned object, every donation-flow collection was created with
    branch_id = NULL and drive_id always collapsing to NULL (even for
    Volunteer/Phlebotomist drive-based donations, not just Staff walk-in).
    Data cleanup: existing bad rows needed a one-time backfill joining
    blood_collections/blood_units back through donation_id to recover the
    correct branch_id — see session backfill script (Step 1 + Step 2,
    wrapped in transactions with sanity-check SELECTs before COMMIT).
    Separation-derived collections (source_unit_id IS NOT NULL) were never
    affected — createDerivedCollections() sets branch_id directly from the
    source unit at creation time, no dependency on getDonationById().

54. bloodCollectionModel.js's getAllCollections/getCollectionById/
    getCollectionsByBranch — same gap as #53, one hop downstream: none of
    the three SELECTed bc.donation_id, bc.branch_id, or bc.drive_id. Fixed
    this session: added all three columns to all three queries.
    getCollectionById() specifically is what bloodCollectionService.
    markAsSafe() reads to build the new blood_units row — with donation_id
    missing, markAsSafe() threw a hard 500 ("null value in column
    donation_id... violates not-null constraint") instead of silently
    creating a bad row. No data backfill needed for this one: the NOT NULL
    constraint meant no bad blood_units rows could have been committed
    before the fix — every prior attempt simply failed outright.

55. bloodCollectionService.js's markAsSafe() — only called
    invalidateCache('cache:blood-units:availability') after creating a
    blood unit, never invalidated cache:blood-units:inventory. Both keys
    are cached via bloodUnitRoutes.js's cache(60, () => '...') on GET
    /availability and GET /inventory respectively (static keys, no branch
    suffix — confirmed via bloodUnitRoutes.js). bloodUnitService.js's
    updateUnitStatus() and separateUnit() already correctly invalidate
    both keys (per #40) — markAsSafe() was the one straggler. Fixed this
    session: markAsSafe() now invalidates both keys, same pattern as the
    other two mutation paths. Note: GET /branch/:branch_id and GET / (the
    routes Staff's Main Inventory page actually uses) have no cache()
    middleware at all, so this gap never affected that page directly —
    only the /availability (Requestor) and /inventory (aggregate
    blood-type count) endpoints could have served a stale response for up
    to 60s after a Mark Safe action.

⚠ Pattern flagged across #53–#55: three separate "SELECT doesn't return a
  column the caller actually needs" bugs stacked across three adjacent
  files in the same donation→collection→unit chain, each only surfacing
  once the layer below it was exercised (same shape as the fulfillment-
  options bug in #48/#49 — one fix revealing the next). Worth a targeted
  review of any other repository file's SELECT list vs. what its
  corresponding service actually destructures off the returned row,
  before building new features on top of donations/collections/units.
56. Frontend hardcoded hemoglobin/extraction thresholds (HGB_MAX/HGB_MIN_M/
    HGB_MIN_F in donorScreening.js, QNS_THRESHOLD=15 in donorDonation.js) —
    duplicated backend's constants/medicalRules.js instead of mirroring it.
    Fixed this session: created js/constants/medicalRules.js as the frontend
    mirror; both files now import HEMOGLOBIN/EXTRACTION from it instead of
    hardcoding. Same manual-sync discipline as every other frontend/backend
    constants pair in this project — no shared build step, so both files
    must be updated together by hand if PRC ever changes these thresholds.

57. donorInterviewController.js's createInterview() permanently blocked a
    NEW interview for any walk-in donor with a completed interview record,
    regardless of whether their full cycle (screening + donation +
    collection) had already finished — treated "has an interview ever" as
    "blocked forever" instead of "has an unfinished cycle right now." Same
    "any record ever" bug pattern independently existed in donorScreening.js
    (screenedIds dropdown filter) and donorDonation.js (donatedIds dropdown
    filter), plus their respective per-donor "already done" checks. All
    fixed together this session via a new chain-aware cycle-status system —
    see the "Donor Cycle Status System" build note below for the full
    design. Drive-scoped Volunteer/Phlebotomist behavior deliberately left
    untouched throughout — each blood drive is already its own isolated
    cycle via drive_id scoping, which is a correct, different mechanism.

58. The cycle-status logic above initially stopped tracking a donor's cycle
    at "donation recorded" — treating that as a fully completed cycle (and
    therefore free to start a new interview) without ever checking whether
    blood_collections had a matching row. A donor whose donation succeeded
    but whose collection wasn't yet recorded would vanish from
    donorDonation.js's own dropdown the moment they navigated away, with no
    way back to finish their in-progress collection. Fixed by adding a
    'proceed_collection' state to both donorCycleRules.js (backend) and
    donorCycleStatus.js (frontend mirror), and a bloodCollectionModel.js
    lookup (getCollectionByDonationId) so the chain check can see collection
    status, not just donation status.

59. screeningModel.getScreeningsByDonor() and donationModel.getDonationsByDonor()
    both return arrays ordered DESC (newest first), but donorScreening.js
    and donorDonation.js picked "the latest record" via
    array[array.length - 1] — which is actually the OLDEST record in a
    DESC-sorted array. Harmless when a donor had exactly one record (index 0
    and the last index are the same element), but became an active bug the
    moment a donor had a second cycle — exactly the population #57's fix
    was for. Fixed to array[0] in both files.

60. donorScreening.js's _updateResultPreview() called _computeResult(), a
    function that was never defined anywhere in the file — a pre-existing
    dangling reference unrelated to any change made this session (confirmed
    by checking; the function this session touched was _computeHgbStatus,
    a different one). Threw a ReferenceError on every hemoglobin input
    change, meaning the live screening-result preview could never have
    worked. Fixed by adding the missing function — maps hemoglobin_status
    ('Allowed'/'Not Allowed') to the actual screening_result value
    ('Eligible'/'Deferred') used everywhere else.

61. donationModel.js's getAllDonations/getDonationById/getDonationsByDonor
    did not SELECT dn.screening_id, despite contract.md documenting
    screening_id as a returned field on all three. Same missing-column
    pattern as #53/#54. Fixed this session — added to all three queries.
    This was a hard prerequisite for the donor-cycle-status chain logic
    (which looks up a donation by screening_id) and for donorDonation.js's
    per-donor "already donated for THIS specific screening" check
    (previously could only check "any donation for this donor, ever").

62. donationService.js's createDonation() reimplemented the QNS
    >15-minutes check inline with a hardcoded 15, instead of calling
    evaluateExtractionTime() from donationRules.js — which already existed
    for exactly this and derives its threshold from
    constants/medicalRules.js (EXTRACTION.MAX_DURATION_MINUTES). Same class
    of bug as #56, just backend-side. Fixed this session — createDonation()
    now calls evaluateExtractionTime(), same as bloodCollectionService.js
    already did.

63. donations.extraction_time_minutes (integer, whole minutes only)
    replaced this session with extraction_time_seconds (integer, total
    seconds) as the single source of truth — there was previously no way
    to record a partial-minute extraction duration. Migration converted
    existing rows (extraction_time_seconds = extraction_time_minutes * 60)
    before dropping the old column. Every reference updated: donationModel.js
    (all 4 queries), donationRules.js (MAX_DURATION_SECONDS derived from
    EXTRACTION.MAX_DURATION_MINUTES, not a separate hardcoded value),
    donationService.js, bloodCollectionService.js's extraction_time_minutes
    branch (renamed for consistency — flagged as possibly unreachable code,
    see below), fieldWorkflowValidation.js's validateDonation(), and
    donorDonation.html/js (single input split into two — minutes + seconds
    — combined into total seconds client-side before POST). Supersedes
    item #32 above, which documented the old minutes-only field mapping —
    left in place for history rather than deleted, but no longer current.
    NOTE on bloodCollectionService.js: its extraction_time_minutes-reading
    branch was renamed to extraction_time_seconds for consistency with
    evaluateExtractionTime()'s new contract, but contract.md's documented
    POST /api/blood-collections body has no extraction-time field at all,
    and the frontend collection form never sends one — this branch appears
    unreachable in current usage. Not investigated further this session.

64. bloodCollectionModel.js's getCollectionById() already JOINs donations
    (for the cross-drive ownership check) but wasn't selecting
    dn.extraction_time_seconds off it — the Blood Collections detail modal
    had no way to display extraction time even though the join was right
    there. Fixed this session — added the one field to the existing join.
    Blood Unit detail modal has the same gap (bloodUnitModel.js not yet
    reviewed) — still open, see sessionState.md Not Started.

65. donorDonation.js's donation->collection step transition was the ONLY
    step boundary in the whole field workflow relying purely on an
    in-memory variable (_createdDonation) with no sessionStorage fallback —
    every other boundary (interview->screening, screening->donation) already
    used the sessionStorage pattern. Compounding this, the straightforward
    `_createdDonation = donation;` assignment after a successful
    POST /api/donations was missing from the file entirely, meaning the
    collection step could never resolve the donation it had just created —
    surfaced as "Could not find the extraction record" even on a first,
    uninterrupted attempt, with the donation itself successfully sitting in
    the database. Fixed this session: assignment restored, plus a
    sessionStorage fallback (field_donation_id / field_donation_donor_id)
    added matching the established pattern, cleared on successful collection
    submit. See sessionState.md's Reference section for the updated
    sessionStorage chain — donation is no longer the terminal write.

66. upstashRateLimiter.js's apiRateLimiter was mounted globally on all of
    /api at 100 requests/15min, IP-keyed — a login-appropriate shape
    (tight, long window) applied to ALL authenticated GET traffic instead.
    Given every entry file calls refreshBadge() on load (per its own
    established pattern) plus each page's own data fetches, a single page
    navigation alone can fire 5-15 API calls — a normal work session of a
    handful of navigations could exhaust the 100-request budget and then
    429 every subsequent request, including unrelated ones, for up to 15
    minutes (sliding window, not a fixed reset). Fixed this session: window
    narrowed to 1 minute with a 300-request ceiling (self-heals within a
    minute even if hit), and the limiter now keys on authenticated user_id
    (decoded from the same cookie/header authMiddleware.js reads) rather
    than raw IP, so multiple staff sharing an office IP no longer share one
    shared budget. loginRateLimiter deliberately left IP-keyed and
    otherwise untouched — a login request has no token yet to key on, and
    IP-based brute-force protection is the correct model there. Also fixed
    the 429 response body from the pre-#31/#48 shape ({ status: 'error' })
    to { success: false }, matching every other endpoint.

---

## Known Bugs That Burned Time

### Auth
- auth.js duplicate line in getCurrentUserSilent() → syntax error → all exports broken
  → every page redirects to login on tab open. Fix: clean up the duplicate line.
- getCurrentUser() on login page → 401 → refresh → 401 → redirect loop → 429 rate limit.
  Fix: use getCurrentUserSilent() on login page only.

### API
- credentials: 'include' missing → cookies not sent → 401 on every request
- Authorization header sent on web → token not found → 401
- body.status === 'success' check → all responses silently fail (was string, now boolean)
- apiFetch() used inside tryRefresh() → infinite refresh loop

### Field Workflow
- Admin allowed on workflow pages → null drive_id + wrong branch_id → orphaned records
  → duplicate donor entries in dropdowns. Fix: Admin excluded from all field pages.
- Admin-created walk-in records may have branch_id auto-assigned (not null).
  To find and clean: SELECT di.* FROM donor_interviews di JOIN users u
  ON di.conducted_by = u.user_id WHERE u.role_id = 1;
- Raw fetch() used instead of apiFetch() in entry file → "apiFetch is not defined"
- interview_id sent as screening_id → 400 from backend
- answer: 'yes' (lowercase) → backend rejects, must be "YES"/"NO"
- hemoglobin_status/screening_result rendered as <select> → violates auto-compute rule
- blood_type_confirmed made optional → backend requires it → 400 on submit
- birthdate comparison: API returns ISO string "1990-05-15T00:00:00.000Z",
  form input gives "1990-05-15". Must normalize both with .slice(0, 10) before comparing.
- <select> used for phlebotomist → must be searchableDropdown with hidden input
- extraction_time sent as decimal → backend receives float, must be whole minutes.
  Fix: step="1" on input + Math.round() before sending.

### Routing / Serving
- Relative paths in HTML (../assets/css/) → 404 when browser URL is in subfolder
- Entry file used ../ for imports from role subfolder → wrong path → Express serves index.html
- navbar brand pointed to '/' → two-hop redirect flash on every click
- ROUTES.FIELD.COLLECTION not updated to point to donorDonation.html → 404

### Sidebar
- 'operations' used as section name (renamed to 'general') → empty sidebar
- revealAppShell() called after an await → shell stays invisible during wait
- Admin sidebar still had workflow links after role removal → links still accessible

### CSS
- Overrode .btn-primary in page CSS → shared class affected → style leaks across pages
- notif badge not rendered when unreadCount === 0 → updateBadge() silently failed
- staff/bloodUnits.css (page-specific file) redefines .page-header directly
  (flex/space-between + h1 sizing) — this is the SAME anti-pattern as the
  .btn-primary bug above, found this session while building Inventory Cleaning.
  Not fixed (out of scope this session, flagged only) — deliberately NOT
  replicated in inventoryCleaning.css. If a cleanup pass happens, this needs
  a modifier class instead (e.g. .page-header--with-action) rather than
  overriding .page-header itself.
  ⚠ STILL OPEN as of Blood Separation session — staff/bloodCollections.css also
  has the same override (confirmed while doing the modal-classes DRY pass this
  session). staff/bloodSeparation.css was deliberately built WITHOUT this
  override (no filter control on that page, so no reason to override
  .page-header at all) — but bloodUnits.css and bloodCollections.css's
  page-level files themselves were not touched. Still needs the
  .page-header--with-action modifier-class cleanup mentioned above.
- .modal-field-label / .modal-textarea / .detail-list were duplicated
  identically across features/bloodUnits.css and features/bloodCollections.css
  (flagged, not fixed, in a prior session). FIXED this session (Blood
  Separation build): moved all three classes into main.css under a new
  "Shared modal field patterns" section; removed the duplicated blocks from
  both feature CSS files. features/bloodSeparation.css (new this session)
  never had to define them at all — it only adds a small .modal-body ul rule
  for the separation result list.

### Inventory Cleaning (Section 3) — build notes
- Selection is expired-only by design, not an oversight — see Key Decisions
  in sessionState.md if this ever looks like a missing feature for near-expiry.
- No bulk-dispose endpoint exists backend-side — bulkDisposeUnits() loops the
  single-unit PATCH /:id/status per selected unit and is NOT atomic. A
  partial failure mid-loop is expected and handled (toast reports
  succeeded/failed counts separately), not a bug to "fix" toward atomicity
  unless a real bulk endpoint gets built.

### Blood Requests — backend audit notes, this session (frontend not yet built)
- Branch-scoping bug fixed — see #42 above. Frontend Staff management page
  can rely on GET /api/blood-requests already being branch-scoped server-side
  once built; no client-side filtering needed.
- Do not build the Submit Request page assuming the backend auto-picks a
  branch — see #45. The two-step flow (fulfillment-options → submit with
  chosen branch_id) must be implemented as two separate API calls.
- Do not wire a socket listener expecting blood_request_status on cancel or
  markReceived — see #44. Those two actions only need to update the UI from
  their own API response.
- request_items uses `units_requested` / `units_fulfilled`, NOT `quantity`.
  contract.md previously documented `quantity` — now corrected.

### Blood Separation (Section 4) — build notes, this session
- confirmModal() in modal.js previously always styled its confirm button
  btn-danger, even for non-destructive confirmations (e.g. Mark Safe in
  Blood Collections). Fixed this session: added a 4th `danger` param
  (default true, so no existing caller's visual behavior changes unless
  explicitly updated). bloodCollectionsUI.js's handleMarkSafe() updated to
  pass danger=false, since marking a collection Safe is a positive/progressing
  action, not destructive. bloodSeparationUI.js's confirm call uses the
  default (danger=true) since separation is genuinely irreversible.
- Separation's confirm step deliberately uses the plain confirmModal()
  pattern, not the typed-word ("remove") pattern used by Inventory Cleaning's
  bulk removal. bloodsync.md's typed-word requirement (#11) is scoped to
  bulk inventory removal specifically — Separation is a single-unit action
  with its own clear "no going back" warning text in the confirm message,
  judged sufficient friction without adding a typed-word gate.
- POST /api/blood-units/:id/separate's response (separated_unit,
  derived_collections) returns raw DB rows with no donor/branch name joins.
  bloodSeparationUI.js's result modal sources donor/blood-type display info
  from the unit row already held client-side (the one the user clicked),
  not from the separate response — same "don't assume response has display
  joins" caution as bloodUnitsApi.js's comment on updateUnitStatus.

### Blood Requests — Submit Request build (this session)
- roleMiddleware.js 403 responses used the pre-fix #31 shape
  ({status:'error'}) — masked as a confusing 500 + "Cannot read properties
  of undefined (reading 'length')" on the frontend because bloodRequestApi.js
  checks body.success, which didn't exist. Fixed — see #48.
- Underneath that, a second, independent bug: fulfillmentService.js's
  getFulfillmentOptions() crashed on every valid call, 500, because
  validateItems() never returned its errors array. Only surfaced once the
  role issue above was fixed and a real Requestor request reached this
  code path for the first time. Two separate bugs stacked on the same
  endpoint — fixing one revealed the other. See #49.

### Donation → Collection → Blood Unit branch_id chain (this session)
- Staff-created blood units showing no branch_id traced back through 3
  layers: donationModel.getDonationById() missing branch_id/drive_id in
  its SELECT → bloodCollectionService.createCollection() silently
  inserting NULL → same gap one hop later in
  bloodCollectionModel.getCollectionById() → markAsSafe() 500ing on a
  NOT NULL violation for donation_id. All three SELECTs fixed (#53, #54).
  JWT/branch_id-on-login itself was never the problem — verified correct
  via authService.js and the actual staff user row before continuing the
  trace.
- Once collection/unit creation was fixed, a separate caching bug
  (#55) initially looked like the same issue re-appearing ("unit still
  not showing") — was actually markAsSafe() only invalidating one of two
  relevant cache keys. Confirmed via bloodUnitRoutes.js that the two
  invalidateCache() keys are static strings matching the routes' cache()
  keyFns exactly, not a mismatch — fix was additive (add the missing
  invalidateCache call), not a rename.