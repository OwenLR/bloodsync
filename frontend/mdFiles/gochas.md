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