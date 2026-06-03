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

### Process 3 — Blood Request
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