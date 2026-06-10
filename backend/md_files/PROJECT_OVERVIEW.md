# BloodSync Project Overview

## Project Name
BloodSync

## Project Description
Blood bank inventory and management system built as a thesis project (Thesis 2 —
Implementation and Deployment phase) for Philippine Red Cross Batangas. Converted
from a legacy PHP + MariaDB system to a modern Node.js + PostgreSQL stack.

## Business Problem Being Solved
Philippine Red Cross Batangas needed a modern system to manage:
- Blood drive events with volunteer/phlebotomist assignments
- Donor registration, interview, screening, and blood extraction workflow
- Blood inventory tracking from collection to unit availability
- Blood requests from hospitals/requestors with auto-assignment (FEFO)
- Real-time and scheduled notifications for staff

## Project Goals
- Complete backend API for thesis defense (late September 2026)
- Real users conducting UAT online
- Professional-grade architecture despite academic context
- Railway deployment with Hostinger domain

## Core Features
1. Blood drive management with participant assignment and access control
2. Donor registration with duplicate detection (national ID)
3. Donor interview → screening → donation → blood collection chain
4. Blood inventory management (blood_collections → blood_units)
5. Blood requests with FEFO auto-assignment and race condition protection
6. Volunteer/Phlebotomist registration with admin approval flow
7. Requestor self-registration and blood availability viewing
8. Real-time notifications (Socket.io) for new blood requests
9. Email notifications (nodemailer) for drive assignments, donor post-extraction
10. Scheduled daily inventory checks (low stock + near expiry alerts)

## User Roles
| role_id | Role | Description |
|---|---|---|
| 1 | Admin | Full system access |
| 2 | PRC Staff | Branch-scoped operations |
| 3 | Donor | Not a login role — donors are not system users |
| 4 | Requestor | Self-register, submit blood requests |
| 5 | Volunteer | Field role, assigned to blood drives |
| 6 | Phlebotomist | Field role, assigned to blood drives |

## Major Workflows
1. Donor Registration → Interview → Screening → Donation → Blood Collection → Blood Unit
2. Blood Drive Creation → Participant Assignment → Drive Active → Field Operations
3. Requestor → Submit Blood Request → Staff Approve (FEFO auto-assign) → Release
4. Daily Cron → Check Inventory → Email Low Stock / Near Expiry Alerts

## Current Development Status
Thesis 2 — Implementation phase. Backend nearly complete. Frontend not started.

## Completed Features
- Full layered architecture conversion (domain → repositories → services → validators → controllers)
- All core workflows (donor, interview, screening, donation, collection, blood units, requests)
- Blood drive management with participant assignment
- Cross-drive access control (volunteers/phlebotomists scoped to their drive)
- businessError.js — typed error class for known business rule violations
- Registration system (requestor/volunteer/phlebotomist unified in users table)
- Security: JWT, bcrypt, Upstash rate limiting, GlitchTip error tracking
- File storage: Cloudinary (profile images, request forms)
- Caching: Upstash Redis (blood availability, 60s TTL)
- Volunteer self-profile update (identity fields locked server-side)

## Pending Features
- Notifications (next — in planning, contract defined, ready to implement)
- Reports
- Frontend (HTML + CSS + Vanilla JS)
- Railway deployment

## Known Issues
- None confirmed post-architecture conversion. Server starts clean.

## Future Enhancements (Post-Defense)
- Mobile app (React Native)
- Donor login and self-service
- SMS notifications

## Important Constraints
- No separate requestors table — requestors are in users table (role_id = 4)
- No cryoprecipitate in component_expiry_days (intentionally removed)
- No total_donations column on donors (computed from donations table)
- Volunteers/Phlebotomists MUST be assigned to an active blood drive to perform
  field operations (POST donor, interview, screening, donation, collection)
- PRC Staff can only create/manage blood drives for their own branch
- All datetimes stored as TIMESTAMPTZ, Philippine time comparisons use
  'Asia/Manila' explicitly — Railway runs UTC