# BloodSync Project Overview

## What Is BloodSync
BloodSync is a blood bank inventory and management system
built as a thesis project for presentation in late September 2026.
It is being converted from a legacy PHP + MariaDB system
to a modern Node.js + PostgreSQL stack.

The system manages the full blood bank workflow:
- Donor registration and screening
- Blood collection and testing
- Blood inventory management
- Blood requests and fulfillment

## Project Type
- Academic thesis project (with real-world professional standards)
- Full stack web + mobile application
- REST API architecture

## Team
- Solo developer (or small team)
- Based in Batangas, Philippines
- Philippine Red Cross (PRC) blood bank system

## Thesis Defense Date
Late September 2026

## Tech Stack
- Backend API: Node.js + Express.js
- Database: PostgreSQL (hosted on Neon.tech)
- App Hosting: Railway
- Domain: Hostinger (pointed to Railway)
- Mobile App: React Native (Expo) — future phase
- Web Frontend: HTML + CSS + Vanilla JS — future phase
- Version Control: GitHub

## Core System Scope (Thesis Focus)
Three main processes only:

### Process 1 — Blood Collection
Volunteer/Phlebotomist registers donor
→ Donor interview questionnaire
→ Physical screening (hemoglobin, blood type, weight, BP)
→ Blood extraction
→ Blood collection record created (temporary holding)

### Process 2 — Blood Processing
PRC Staff receives blood collection
→ Blood testing
→ Marks as Safe or Rejected
→ If Safe → blood unit auto-created in main inventory

### Process 3 — Blood Request# BloodSync Project Overview

## What Is BloodSync
BloodSync is a blood bank inventory and management system built as a thesis project (Thesis 2 — Implementation and Deployment phase). It is being converted from a legacy PHP + MariaDB system to a modern Node.js + PostgreSQL stack.

The system manages the full blood bank workflow:
- Volunteer/Phlebotomist/Staff registration with admin approval
- Requestor self-registration
- Donor registration and duplicate detection
- Donor interview (questionnaire)
- Physical screening (hemoglobin, blood type, weight, BP)
- Blood collection and testing
- Blood inventory management
- Blood requests and fulfillment

## Project Type
- Academic thesis project — Thesis 2 (Implementation/Deployment)
- Real users conducting UAT (User Acceptance Testing) online
- Full stack web + mobile application
- REST API architecture
- NOT a demo — live system with real users

## Team
- Solo developer (or small team)
- Based in Batangas, Philippines
- Philippine Red Cross (PRC) blood bank system

## Tech Stack
- Backend API: Node.js + Express.js
- Database: PostgreSQL (hosted on Neon.tech)
- App Hosting: Railway
- Domain: Hostinger (pointed to Railway)
- Mobile App: React Native (Expo) — future phase
- Web Frontend: HTML + CSS + Vanilla JS — in progress
- Version Control: GitHub
- Error Tracking: GlitchTip (using @sentry/node SDK)
- File Storage: Cloudinary (profile images, request forms)
- Caching + Rate Limiting: Upstash Redis (@upstash/redis, @upstash/ratelimit)

## Core System Scope

### Process 1 — Donor Registration
Volunteer registers donor → duplicate check via national ID → if duplicate, return existing record

### Process 2 — Donor Interview
Volunteer creates interview session → donor answers 34 questions → system auto-detects deferrals → interview result set to Passed or Failed → deferred donors blocked same day

### Process 3 — Physical Screening
Only allowed after interview Passed → staff records weight, BP, hemoglobin, blood type → screening result set to Eligible or Deferred

### Process 4 — Blood Collection
Only after screening Eligible → donation created (auto-fills from screening) → blood collection recorded → extraction time checked (>15 min = QNS) → staff marks Safe or Rejected → Safe auto-creates blood unit in inventory

### Process 5 — Blood Request
Requestor registers and logs in → views blood availability → submits blood request with hospital info → staff reviews → system auto-assigns nearest expiry blood unit (FEFO) → blood unit status Released

## Registration Types
- Admin/PRC Staff: Admin-created only via POST /api/users
- Requestor: Self-register, immediately Active
- Volunteer: Self-register, status Pending until Admin approves
- Phlebotomist: Self-register, status Pending until Admin approves

## Out Of Scope (Confirmed)
- Payments
- Donor login system
- Blood drive management — MOVED TO CURRENT SCOPE (see below)
- Notifications — MOVED TO CURRENT SCOPE
- Reports — MOVED TO CURRENT SCOPE
- Manual blood unit assignment (auto-assign only)

## Current Scope (Thesis 2 — All Required)
- Blood drive management
- Real-time notifications (Socket.io)
- Reports
- Frontend (HTML + CSS + Vanilla JS)
- Railway deployment

## Future Features (After UAT)
- Mobile app (React Native)
- Donor login and self-service
- Email notifications (nodemailer)
Requestor registers and logs in
→ Views blood availability (Available/Not Available only)
→ Submits blood request with hospital info + document
→ PRC Staff reviews and confirms
→ System auto-assigns nearest expiry blood unit
→ Blood unit status → Released

## Out Of Scope (For Now)
- Payments
- Blood drive management (planned for future)
- Donor login system (planned for future)
- Notifications (planned for future)
- Reports (planned for future)
- Manual blood unit assignment (auto-assign only)

## Future Features (After Defense)
- Blood drive management with staff assignment
- Donor login and self-service
- Real-time notifications (Socket.io)
- Mobile app (React Native)
- Email notifications (nodemailer)