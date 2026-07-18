Chapter 3

METHODOLOGY

Research Design	
This study employed an applied research approach, which focuses on solving practical problems and developing tangible solutions for real-world use. This study specifically addresses the inefficiency and inaccuracy in donor management and blood bank inventory processes caused by reliance on manual and Excel-based systems in selected Philippine Red Cross Batangas facilities. This approach is appropriate for the study because its primary objective is not only to examine the existing donor management and blood bank inventory processes of the Philippine Red Cross Batangas branches, but also to develop and validate a functional web-based application that improves efficiency, accuracy, and coordination of the four Philippine Red Cross facilities across the entire Batangas Province.

The applied research design follows the Waterfall Model of a System Development Life Cycle (SDLC), which is a structured and sequential software development methodology consisting of clearly defined phases, namely: Requirements Analysis, System Design, Implementation, Testing, Deployment, and Maintenance.

During the Requirements Analysis phase, data are gathered through in-person interviews, observation, and review of existing documents and workflows within selected PRC Batangas branches. This phase identifies the challenges in current processes and defines the functional and non-functional requirements of the system, including blood donation management, donor monitoring, blood bank inventory management, and analytic features.

In the System Design phase, the overall structure of the website is planned. This includes the design of the system architecture, database schema, user interfaces, and workflows. Modeling tools used in this study includes Use Case Diagram, Architecture Diagram, Data Flow Diagram (Level 0 and Level 1), and Crow’s foot notation of Entity Relationship Diagram and are utilized to represent system components and interactions clearly.

The Implementation phase involves the development of the system through coding and integration of modules based on the approved design. Key functionalities such as blood donation management, donor monitoring, blood bank inventory management, unified donor ID, blood request processing, and analytics dashboard are developed during this stage following standard programming practices.

The Testing phase focuses on ensuring the functionality, reliability, and usability of the system. This includes unit testing, integration testing, system testing, and user acceptance testing. Errors and inconsistencies identified during testing are corrected to ensure that the system meets user requirements and performs as expected.

The Deployment phase involves the hosting and configuration of the system and its initial use in the selected PRC Batangas branches. End-users, including staff and volunteers, are oriented on how to use the system effectively. The system is then evaluated based on criteria such as accuracy, usability, and response time.

Finally, the Maintenance phase ensures continuous improvement of the system after deployment. This includes fixing bugs, updating features, and adapting the system to changes in operational requirements.

This project will develop a web-based Blood Donation, Donor Monitoring, and Blood Bank Inventory Application with Analytics for the four facilities of Philippine Red Cross Batangas Chapter, focusing on functionalities such as blood donation management, donor monitoring with unified donor ID, blood bank inventory tracking with expiration monitoring, blood request processing, notification features, and basic analytics dashboards for trend identification and stock monitoring. 

Project Scope and Boundaries
Functional Scope
The functional scope of the system covers the entire blood donation and request lifecycle, encompassing donor registration and unified donor ID management, donation scheduling and history tracking, blood inventory management with real-time stock updates, and blood request processing with STAT and routine classification. Request status tracking will follow a defined workflow including submitted, under review, approved, paid, processing, ready, completed, and denied stages. The system will also feature an analytics dashboard for donation trends, alerts for blood shortages and expiring units, and role-based access controls for donors, volunteers, requestors, PRC staff, and administrators. These functionalities are designed to support operational decision-making and enable proactive stock management across all participating branches.

Technical Scope
The system will be built using standard web technologies, utilizing HTML, CSS, and JavaScript for the frontend, PHP for the backend, and MySQL for database management, with XAMPP serving as the local development server during development and testing phases. Hostinger will be used for web hosting and deployment, providing reliable support for PHP and MySQL that makes it suitable for demonstrating and testing the application. The chosen technologies ensure compatibility with standard hosting environments and allow for straightforward deployment and maintenance within the available resources of the capstone project.

Data Scope
The system will collect and manage donor profiles including name, contact details, blood type, and donation history alongside donation records covering donation dates, frequency, and eligibility status. Blood inventory data will encompass blood type, quantity, collection date, and expiration date, while blood request transactions will include requester details, patient information, and request status. The data scope is limited to recent and active records from the four participating PRC branches within the duration of the study, focusing on information that directly supports operational decision-making and does not extend to other Red Cross operations such as disaster response or health education programs.


User Scope
The primary users of the system include PRC staff responsible for donor registration, inventory monitoring, and request processing; PRC volunteers who assist in blood donation activities; blood requestors such as hospitals and clinics that submit blood requests; and system administrators who manage user accounts and system configuration. Each user group will interact with the system through dedicated user portals tailored to their respective roles and access levels. The study does not cover other Red Cross personnel outside of blood service operations, such as disaster response teams or rescue units.

Geographic Scope
The system will be implemented and tested within four selected branches of the Philippine Red Cross located in Batangas Province, namely Batangas City, Lipa City, Tanauan City, and Nasugbu. This multi-branch coverage is intended to enable centralized coordination and streamlined blood service operations among these facilities.

Domain Scope
The project is limited to the domain of blood service operations within the Philippine Red Cross Batangas Chapter, specifically covering donor management, blood donation processes, and blood bank inventory management. The system will not include integration with national health databases, hospital information systems, or any external medical platforms outside the scope of the four participating branches, and advanced predictive analytics or machine learning models are likewise excluded from this implementation.

What Is Excluded (Out of Scope)
Other Red Cross operations such as disaster response, first aid training, and rescue services
Actual payment processing (payment reference capture only)
Integration with external hospital systems or national health databases
Advanced machine learning models (basic trend analysis only)
IoT integration for temperature monitoring
Mobile application development (web-based with responsive design only)
Branches outside the four selected locations
Multi-language support beyond English and Filipino
Blood testing and laboratory management features
SMS notifications (email only)
Automated donor-recipient matching

These exclusions are due to time and resource constraints of the capstone project, as well as the specific focus on donor management and blood inventory processes. Features such as disaster response coordination, hospital system integration, and advanced predictive analytics are outside the project's scope.

								
Project Development Model	

Figure 1: Waterfall Methodology Diagram

This study adopted the Waterfall Development Model as the project development framework. The model follows a sequential approach in which each phase is completed before proceeding to the next. This structure was used to organize the development of the system from requirement identification to final testing and deployment. The Waterfall model was applied to ensure that system requirements, particularly those related to donor monitoring, blood inventory tracking, and blood request processing, were clearly defined before development began. Each phase of the project was documented and used as the basis for the succeeding stage.


Phase 
Timeline
Iterations
Activities
Milestones
Requirements Analysis
Week 1-2
Iteration 1: Data gathering

Iteration 2: Requirements validation and consolidation
Conduct interviews with Philippine Red Cross - Lipa staff and DLSL Red Cross Youth 

Observe current workflows

Define the functional and non-functional requirements
System Requirements Specification (SRS)

Non-Functional Requirements Specification (NFRS)
System Design
Week 3-4
Iteration 1: Initial system and database design

Iteration 2: Refinement of diagrams and UI based on feedback
Design system architecture

Create Use Case Diagram, Data Flow Diagram, and Entity Relationship Diagram

Create database schema

Create UI wireframes and system workflows
System Design Specification (SDS)
Implementation 
Week 5-8
Iteration 1: Admin module

Iteration 2: Philippine Red Cross staff module

Iteration 3: Volunteer module

Iteration 4: Blood Requestor module


Design and implement MySQL database

Develop backend using PHP

Develop frontend using HTML, CSS, and JavaScript

Integrate all system modules
Functional System Prototype
Testing
Week 9-10
Iteration 1: Unit testing of each module

Iteration 2: Integration Testing of module interaction

Iteration 3: System Testing

Iteration 3: User Acceptance Testing (UAT)
Perform unit, integration, and system testing

Conduct User Acceptance Testing

Identify and fix bugs and errors

Validate system usability, accuracy, and performance
System Testing Report (STR)
Deployment
Week 11
Iteration 1: System hosting and configuration

Iteration 2: System demonstration and user orientation
Host the system on an online server

Configure database and environment for remote access

Ensure system accessibility via internet
Demonstrate system functionality to stakeholders

Orient selected users on system usage


System Successfully Hosted and Accessible Online
Maintenance
Week 12
Iteration 1: Bug fixing based on initial usage

Iteration 2: Minor adjustments and performance tuning 
Monitor system performance during initial online usage

Fix bugs identified after deployment

Apply minor improvements based on feedback

Ensure system stability
System Stabilized and Finalized After the Initial Deployment Period



Table 1: Timelines and Milestones

The table presented serves as the project’s Waterfall-based development framework, outlining the order of phases, corresponding timelines, iterative activities within each phase, and the expected deliverables or milestones. Each phase, namely Requirements Analysis, System Design, Implementation, Testing, Deployment, and Maintenance, is completed in a step-by-step progression where one phase must be fully accomplished before proceeding to the next.

This structured breakdown was used as a guide in managing and monitoring the development of the proposed system for the Philippine Red Cross Batangas Chapter. It ensures that all required outputs per phase are properly produced, validated, and documented within the allocated 12-week duration. The inclusion of controlled iterations within each phase provides opportunities for refinement and validation of outputs while still maintaining the linear structure of the Waterfall model.

Figure 2: Gantt Chart

The overall project schedule, including task sequences, durations, and dependencies, is presented in the Gantt chart shown below. This timeline was used as a guide in monitoring the progress of the study and ensuring that each phase was completed within the planned timeframe.
							
Requirements Analysis	
Requirements analysis is a critical phase in software development where the development team identifies, documents, and validates what the system needs to accomplish. This section describes the techniques used to gather requirements, the functional and non-functional requirements of the proposed system, and the use cases that illustrate system interactions.

To ensure that the system accurately addresses the needs of the Philippine Red Cross Batangas branches, multiple requirements gathering techniques were employed.

a. Interviews
One-on-one and group discussions were conducted to collect detailed information about current processes and system expectations. The research team conducted interviews with the Red Cross Youth (RCY) President of De La Salle Lipa, the Branch Head of the Philippine Red Cross Lipa Chapter, and RCY volunteers. These interviews allowed the team to explore existing workflows, identify pain points in donor registration and inventory management, and clarify specific functional needs such as unified donor identification and automated inventory tracking. The semi-structured format of the interviews enabled the team to ask follow-up questions and uncover requirements that might not have been captured through other methods.

b. Questionnaires
Structured questionnaires were prepared and administered to PRC staff and volunteers to gather requirements in a systematic and efficient manner. The questionnaires contained a mix of closed-ended and open-ended questions designed to collect information about current manual processes, challenges encountered, and desired features for the proposed system. Questions covered topics such as how donor information is currently recorded and stored, how blood inventory updates are performed, how blood shortage detection is handled, how blood requests are processed, and how useful certain system features such as automated notifications, unified donor IDs, and analytics reports would be for daily operations. The use of questionnaires allowed the team to collect consistent data from multiple respondents across different branches and to quantify the frequency and severity of specific operational problems. The responses were analyzed to identify common themes and prioritize system features based on user needs.

c. Document Analysis
Existing documentation from the Philippine Red Cross was examined to understand current operational procedures. This included reviewing donor registration forms, medical history questionnaires, physical examination forms, Daily Blood Information (DBI) reports, dispense Excel files, and monthly report templates. The analysis of these documents helped the team understand what data elements are currently being collected, how information flows between forms and reports, and what improvements are needed in terms of data organization and accessibility.

d. Observation
The research team observed current work practices at selected PRC branches to understand how tasks are performed in the natural environment. This included observing how staff manually compute expiration dates by adding 35 or 34 days from the collection date, how inventory levels are checked by visually inspecting refrigerator units, how blood requests are processed through phone calls with manual verification and reservation within a 6-hour collection window, and how monthly reports are prepared over 2-3 days before month-end. Observation revealed implicit requirements that users might not have thought to mention, such as the need for automated expiration date calculation and real-time inventory visibility.

Functional Requirements Specification (FRS)
Functional requirements describe the specific operations and services that the system must provide for its users, namely admin, PRC staff, volunteer and blood requester.

Each functional requirement is prefixed to indicate the user role it belongs to. FRA refers to Admin requirements, FRS refers to PRC Staff requirements, FRV refers to Volunteer requirements, FRR refers to Requestor requirements, and FRX refers to system-wide requirements shared across all roles. Numbering resets to 01 for each role prefix.

The functional requirements of the proposed system are as follows:
The following requirements apply to the Admin role. 
FR ID
Requirement
Description
FRA-01
Dashboard
The Admin dashboard shall display: count of active users per role with overall total; blood unit counts per branch (available, not expired) broken down by component and blood type; and count of expired units per branch, presented using charts (pie/bar) where appropriate.
FRA-02
User Management
The Admin shall be able to view, activate, and deactivate accounts for PRC Staff, Volunteers, Requestors, and Phlebotomists. Each user list shall show name, branch (where applicable), status indicator (green = active, red = inactive), and a collapsible detail view per entry.
FRA-03
Add Users
The Admin shall be able to create accounts for PRC Staff (with branch assignment), Volunteers, Requestors, and Phlebotomists. First and last names shall be stored in both the role-specific table and the shared users table. Passwords shall be autogenerated (random) and hashed before storage.
FRA-04
Blood Donation Management
The Admin shall be able to create blood drive programs, assign Volunteers and Phlebotomists to drives, view active drives (status: upcoming/ongoing), view drive history (completed/cancelled), and cancel active drives. Completed and cancelled drives shall be read-only.
FRA-05
Blood Unit Management
The Admin shall be able to view all blood units across all branches, add new units to a specific branch inventory (barcode, component, blood type; status auto-set to available), and withdraw/deduct units from inventory by setting their status to deduced.

Table 2.1: Functional Requirements Specification (FRS) for Admin

PRC Staff (FRS)
The following requirements apply to PRC Staff users.
FR ID
Requirement
Description
FRS-01
Dashboard
The PRC Staff dashboard shall display the count of current blood stocks and a pie chart showing the breakdown of blood units by status (safe, near expiry, expired). The dashboard is accessible to authorized staff of the logged-in branch only.
FRS-02
Blood Unit Inventory View
The system shall allow PRC Staff to view all current (active, non-released) blood units in inventory. Display shall be filterable by PRC branch via four clickable branch buttons. Each record shall show: Unit Number/Barcode, Blood Type, Component, Status, Days Left, and Expiration Date.
FRS-03
Add Blood Unit
The system shall allow PRC Staff to record a new blood unit by entering the barcode, blood type, component, and collection date. The system shall auto-calculate and display the expiration date in real time based on component type.
FRS-04
Withdraw / Dispose Blood Unit
The system shall allow PRC Staff to dispose of near-expired and expired units (with a confirmation prompt requiring the user to type 'dispose'), and to withdraw units by searching or scanning a barcode with multi-selection support. Bulk disposal options (dispose all expired, dispose all) shall be available.
FRS-05
Blood Request Management
The system shall display active blood requests in a first-come-first-served list. STAT requests shall be highlighted in light red and pinned to the top of the active list. Staff shall be able to review, approve, reject, or process requests. A separate list of completed and declined requests shall be displayed below the active list.
FRS-06
Request Detail View
The detailed blood request view shall display submitted form fields on the left and the uploaded original signed paper request form on the right for side-by-side verification. Staff shall be able to zoom in and out on uploaded documents. Payment screenshot verification shall follow the same side-by-side layout.
FRS-07
Blood Release Authorization
The system shall implement a double-authentication mechanism for blood release. Staff shall only be able to authorize the release of blood after payment confirmation is received. This release authorization mechanism shall not be visible or accessible to Requestor-role users.
FRS-08
Report: Added / Released Units
The system shall generate a report of added and released blood units, toggled by two clickable buttons. Each view shall display the count for today and the overall total. The Added report columns are: Date Added, Barcode, Blood Type, Component, Status. The Released report columns are: Date Released, Barcode, Blood Type, Component, Reason (Withdraw/Disposed).
FRS-09
Report: Expired Units
The system shall display a detailed table of all expired blood units for the logged-in branch.
FRS-10
Report: Daily Blood Information
The system shall generate a daily blood information report for the logged-in branch, showing dispensed blood units with payment status and amount paid. Branch selection shall be removed; the branch is auto-set from the staff session.
FRS-11
Report: Monthly Report
The system shall generate a monthly report for the logged-in branch, showing dispensed blood units with payment status and amount paid. Branch selection shall be removed; the branch is auto-set from the staff session.

Table 2.2: Functional Requirements Specification (FRS) for Philippine Red Cross Staff
Volunteer (FRV)
The following requirements apply to Volunteer users.
FR ID
Requirement
Description
FRV-01
Dashboard
The Volunteer dashboard shall display: count of today's registered donors, successful blood extractions, and collected blood bags; a pie chart showing the percentage of successful donors out of all registered donors today; a bar chart showing counts of donors registered, eligible from blood type testing, and eligible for blood extraction; and a branch selector for the active blood drive.
FRV-02
Donor Screening: Registration
The system shall allow Volunteers to register blood donors by entering surname, first name, middle name, and birthdate, then clicking 'Check' to detect existing records. If a match is found, the system shall reuse the existing donor ID for a new donation session. If not found, the full registration form shall be enabled (age, address, contact, email, and optional fields). A donor ID is auto-generated for new registrants. If a match is found, the Volunteer may still register as a new donor (new ID assigned) to handle coincidental name/birthdate duplicates. Deferred donors detected on check shall be flagged but their records preserved.
FRV-03
Donor Screening: Questionnaire
The system shall display a sex-based Yes/No questionnaire to determine donor eligibility. The system shall apply eligibility logic stored in the database. Eligible donors shall proceed; deferred donors shall be registered with a deferral status but shall not progress to blood type testing, extraction, or blood unit stages.
FRV-04
Blood Type Testing
The system shall display an inbox-style list of donors who passed screening. Each entry shall include a hemoglobin level input with real-time color feedback (green = allowed) based on sex-specific thresholds: ≥12.5 g/dL for women, ≥13.0 g/dL for men; below 12.5 g/dL is not allowed for either sex. When a donor is allowed, a blood type selector shall appear. Hemoglobin level and blood type shall be saved to the database.
FRV-05
Blood Extraction
The system shall allow Volunteers to record a blood extraction by first selecting an eligible donor ID. A detail box shall display that donor's information including blood type and hemoglobin level. If extraction time is 15 minutes or more, the blood shall be classified as Quantity Not Sufficient (QNS) and the rest of the form shall be disabled except for saving. If under 15 minutes, the full form is available: barcode, phlebotomist identification, blood volume (default 450 ml, editable), extraction date (default today), and extraction time (default now).
FRV-06
Blood Unit Tracking
The system shall display the list of blood units extracted during the blood drive and show their confirmation/arrival status at the designated PRC branch.

Table 2.3: Functional Requirements Specification (FRS) for Volunteer
Requestor (FRR)
The following requirements apply to Requestor users.
FR ID
Requirement
Description
FRR-01
Home: Blood Availability
The Requestor home page shall display the current blood stock count per branch, filterable by blood component. Each blood type box shall list branch availability counts color-coded by stock level (green = available, orange = limited). Branches with zero stock for a selected type and component shall be hidden from that box.
FRR-02
Start New Request
The system shall allow Requestors to submit a blood request via a multi-step form with a visible progress bar. A 'Get Started' button and animated screen transition shall introduce the form. The request shall capture blood type, component, quantity, urgency level, and supporting documents including the original signed paper request form.
FRR-03
Your Requests
The system shall allow Requestors to view all their active and past blood requests in a list, with current status and history visible for each request.
FRR-04
Profile Management
The system shall allow Requestors to view and update their personal account information from the profile page accessible via the top navigation bar.

Table 2.4: Functional Requirements Specification (FRS) for Requestor
System-Wide (FRX)
The following requirements apply across all user roles and define shared system-level functions including authentication, security, audit logging, and deployment compatibility.

FR ID
Requirement
Description
FRX-01
User Registration
The system shall allow Requestors to self-register via the web portal by providing full name, contact details, email address, and account credentials. PRC Staff, Volunteer, and Admin accounts shall only be created by an Admin.
FRX-02
User Authentication
The system shall allow registered users to log in using a valid email/username and password. Login pages shall display role-appropriate messaging (e.g., the Requestor login page displays: 'Need blood fast? Log in and start your request now.').
FRX-03
Role-Based Access Control
The system shall enforce separate access levels for Admin, PRC Staff, Volunteer, and Requestor. Each role shall only be able to access pages and features authorized for their role, enforced via auth_middleware.php and requireRole().
FRX-04
Session Management
The system shall use PHP sessions to maintain authenticated user state. All protected pages shall require a valid session. Users shall be redirected to the login page upon session expiry or unauthorized access.
FRX-05
Password Encryption
All passwords shall be hashed before being stored in the database. Autogenerated passwords shall also be hashed before insertion. Plain-text passwords shall never be stored.
FRX-06
Unified Donor ID Assignment
The system shall automatically generate a unique and permanent donor identification number upon a donor's first-time registration. This ID shall persist and be reused across all future donation sessions for that donor.
FRX-07
Notification and Alerts
The system shall notify PRC Staff of low blood stock levels and blood units that are near expiry or already expired through system alerts on the dashboard and relevant inventory pages.
FRX-08
Search and Filtering
The system shall allow users to search and filter donor records, blood inventory, and blood requests by relevant criteria including blood type, component, PRC branch, date, and status.
FRX-09
Audit Logging
The system shall record critical system activities including logins, donor record updates, inventory changes, blood request approvals/rejections, and blood release authorizations for monitoring and accountability purposes.
FRX-10
File Upload and Document Viewing
The system shall accept file uploads (images, PDFs) for blood request forms and payment screenshots. Uploaded files shall be viewable inline with zoom functionality to support PRC Staff verification.
FRX-11
Hostinger Deployment Compatibility
The system shall be deployable and fully operational on Hostinger shared web hosting using PHP and MySQL. All database interactions shall use PDO exclusively; the use of mysqli is not permitted. The system shall be compatible with Hostinger's PHP version and MySQL configuration.

Table 2.5: System-Wide Functional Requirements Specification


Non-Functional Requirements Specification
Non-functional requirements describe how the system performs its functions and the constraints under which it operates. These requirements apply system-wide across all user roles.
Category
Requirement
Performance


Dashboard pages shall load within 2–3 seconds under normal usage conditions.
Search, filter, and form submission operations shall complete within 1–2 seconds.
The system shall support at least 50–100 simultaneous users without performance degradation.
Scalability


The system shall support future expansion to additional PRC branches without requiring major architectural redesign.
The database shall efficiently handle growing volumes of donor records, blood inventory entries, and blood requests.
The system architecture shall support migration to higher-capacity hosting plans on Hostinger as needed.
Usability
The system shall provide a simple, user-friendly interface suitable for PRC staff and volunteers with basic computer skills.
New users shall be able to complete core tasks (e.g., donor registration, blood request submission) within 5 minutes of first use.
The system shall provide clear inline error messages and guided input validation on all forms.
Navigation shall remain consistent across all pages per role: a persistent left sidebar for Admin, PRC Staff, and Volunteer; a persistent top navigation bar for Requestor.
Requestor-facing pages shall be visually interactive and engaging (animations, transitions) given their public audience.
Reliability


The system shall maintain an uptime of at least 99%, excluding scheduled maintenance windows.
The system shall ensure data consistency and prevent data loss during all transactions, including donor registration, blood unit recording, and request processing.
Database backup mechanisms shall be configured to allow recovery in the event of data loss or corruption.
Security


All protected pages shall require a valid authenticated session before access is granted, enforced via auth_middleware.php.
All user passwords shall be hashed in the database; plain-text passwords shall never be stored.
Access to pages and features shall be restricted by user role; unauthorized access attempts shall redirect to the login page.
The blood release authorization mechanism shall not be visible or accessible to Requestor-role users.
All critical system actions shall be logged for audit and accountability purposes.
Maintainability
The codebase shall be organized into a modular folder structure per user role (admin/, prc-staff/, volunteer/, requestor/) with shared includes (sidebar.php, topbar.php, auth_middleware.php).
All PHP files shall use PDO for database interactions; the use of mysqli is not permitted.
The system shall allow updates and feature enhancements to individual modules without disrupting other core functionalities.
Code shall follow standard PHP and JavaScript conventions for readability, consistency, and ease of debugging.
Compatibility


The system shall be accessible through modern web browsers including Google Chrome, Mozilla Firefox, Microsoft Edge, and Safari.
The system shall function correctly on desktop and laptop devices.
The system shall be deployable and fully functional on Hostinger shared web hosting, compatible with Hostinger's PHP version and MySQL configuration.
All frontend assets (style.css, main.js) shall be referenced using relative paths matching the defined folder structure (../../assets/css/style.css).

Table 3: Non-Functional Requirements Specification
Use Cases

Use Case 1: Admin – Manage System Users and Blood Drives
Actor: Admin

Preconditions:
Admin account has been created in the system
Admin is logged into the system

Main Flow:
Admin views the dashboard displaying active user counts per role, blood unit counts per branch, and expired unit summaries
Admin navigates to the Manage Users section and selects a role to view (Staff, Volunteer, Requestor, or Phlebotomist)
Admin selects a user from the list to view their details
Admin activates or deactivates the selected user account
Admin navigates to the Add section and selects a role to create
Admin enters the required information (name, email, branch where applicable); system auto-generates and hashes a password
System creates the account and displays the newly added user in the Most Recently Added panel
Admin navigates to Blood Donation and creates a new blood drive by entering drive title, description, branch, schedule, and venue details
Admin assigns volunteers and phlebotomists to the drive
System saves the drive with status set to Upcoming

Alternative Flows:
6a. Duplicate email entered: System rejects the entry and prompts the admin to use a different email address
9a. No available volunteers or phlebotomists: Admin may save the drive and assign personnel later from the Active Drives page
3a. Admin cancels an active drive: System updates drive status to Cancelled and the drive moves to history as read-only

Postconditions:
User account is created, activated, or deactivated in the system
Blood drive is saved with assigned personnel and correct status
All changes are reflected immediately across the relevant list pages

Use Case 2: PRC Staff – Process Blood Request and Release
Actor: PRC Staff

Preconditions:
Staff is logged into the system and assigned to a branch
At least one active blood request exists in the queue

Main Flow:
Staff views the dashboard showing current blood stock levels and blood status breakdown
Staff navigates to Blood Requests and views the active request queue in first-come, first-served order
Staff selects a request from the list to open the detail view
Staff reviews the submitted form fields on the left and the uploaded signed request form on the right side by side
Staff verifies that the information on both sides is consistent and accurate
Staff approves the request; system reserves the matching blood units from inventory
Staff receives payment confirmation from the requestor; system enables the Release Authorization button
Staff clicks Release Authorization to authorize the blood unit handout
System updates the request status and records the release

Alternative Flows:
3a. STAT request received: System highlights the request in light red and pins it to the top of the active queue regardless of submission time
5a. Information is inconsistent: Staff rejects the request and system updates its status to Declined with a reason
7a. Payment not yet confirmed: Release Authorization button remains unavailable; staff cannot proceed to release
9a. Staff navigates to Received Blood to confirm arrival of units sent from a blood drive before the units appear in inventory

Postconditions:
Blood request status is updated to Approved, Declined, or Released
Blood unit inventory is adjusted to reflect the released units
Request record is moved to the non-active list and is available in reports

Use Case 3: Volunteer – Register Donor and Record Blood Extraction
Actor: Volunteer

Preconditions:
Volunteer is logged into the system
Volunteer has selected a PRC branch for the active blood drive

Main Flow:
Volunteer navigates to Screening and enters the donor's surname, first name, middle name, and birthdate
Volunteer clicks Check Donor; system searches for an existing record matching the name and birthdate
If the donor is not found, the full registration form is enabled; volunteer completes all required fields including age, address, contact number, and email; system auto-generates a unique donor ID
Volunteer proceeds to the eligibility questionnaire; system displays sex-based Yes/No health screening questions
System evaluates the answers and determines the donor is eligible; volunteer clicks Proceed
Volunteer navigates to Blood Type Testing and locates the donor from the eligible list
Volunteer enters the donor's hemoglobin level; system applies sex-based thresholds and displays real-time eligibility feedback in green if allowed
If allowed, volunteer selects the donor's blood type from the dropdown; system saves the result
Volunteer navigates to Blood Extraction and selects the eligible donor ID
Volunteer enters extraction duration, blood bag barcode, phlebotomist name, blood volume, extraction date, and extraction time
System saves the extraction record and the blood unit appears in the Blood Unit tracking page with a Pending confirmation status

Alternative Flows:
2a. Existing donor found: System displays donor details; volunteer may proceed using the existing donor ID or register a new donor with a new ID if it may be a different person with the same name and birthdate
2b. Donor is found but previously deferred: System flags the donor as deferred; volunteer registers the record but the donor cannot proceed to testing or extraction
7a. Hemoglobin level is below threshold: System displays Not Allowed status in real time; donor does not proceed to extraction
10a. Extraction duration is 15 minutes or more: System classifies the unit as Quantity Not Sufficient (QNS); remaining form fields are disabled except for the Save button

Postconditions:
Donor is registered with a unique ID and assigned an eligibility status
Hemoglobin level and blood type are recorded in the donor's record
Blood extraction is saved and the unit is tracked pending confirmation from PRC Staff


Use Case 4: Blood Requestor – Submit and Track a Blood Request
Actor: Blood Requestor (Authorized Recipient)

Preconditions:
Requestor has a registered account in the system
Requestor is logged into the system

Main Flow:
Requestor views the home page displaying real-time blood availability across all PRC branches, filtered by blood component and color-coded by stock level
 Requestor clicks New Request; system displays the request portal landing page
Requestor clicks Get Started; system transitions to the multi-step request form with a visible progress bar
Requestor reads and acknowledges the Terms and Conditions, selects the request type (Emergency or Standard), and selects the requesting branch and hospital
Requestor enters the patient's full name and age
Requestor selects the required blood type, component type, and number of units; system displays the unit price and estimated total amount
Requestor uploads the official signed hospital request form (PDF, DOC, DOCX, JPG, or PNG, maximum 5MB)
Requestor reviews the complete request summary and submits
System records the request and assigns it a reference number
Requestor navigates to Your Requests to monitor the request through a 7-step status timeline: Request Submitted, Request Approved, Payment Completed, Under PRC Review, PRC Preparing Units, Ready for Collection, and Completed

Alternative Flows:
6a. Requested quantity exceeds 20 units: System displays a validation error and prevents the requestor from proceeding until the quantity is corrected
7a. Uploaded file exceeds 5MB or is an unsupported file type: System rejects the file and prompts the requestor to upload a valid file
8a. Requestor attempts to edit after submission: System does not allow any changes once the request has been submitted
1a. Blood type or component has zero stock at all branches: That blood type box is hidden from the home page availability display

Postconditions:
Blood request is submitted with a reference number and is visible to PRC Staff in the active request queue
Requestor can view and track the full status history of their request from the Your Requests page
System Design Models

Figure 5: Use Case Diagram

Actors
The BloodSync system identifies four primary actors: Admin, PRC Staff, Volunteer, and Blood Requestor. Each actor interacts with the system through a distinct set of use cases based on their role and responsibilities.

System Functionalities
The diagram identifies the following use cases per actor:

Admin
View Admin Dashboard, Manage User Accounts (with extend relationships to Viewing Role of Accounts, Adding User, Deactivate/Reactivate Account, and Editing Details of the Account), Manage Blood Units (Viewing Blood Units, with extend relationships to Filtering and Searching Blood Units and Adding or Withdrawing Blood Units), and Manage Blood Drives (with include relationships to Viewing Active Drives which extends to Edit Volunteer and Phlebotomist and Create a Blood Drive, which includes Schedule Drive with Venue and Date, which further includes Assign Volunteer and Phlebotomist).

PRC Staff 
View PRC Staff Dashboard, Manage Blood Units (with include relationships to Viewing Blood Units, Withdraw/Dispose Units, and Add New Unit), Process Blood Requests (with include relationships to Review and Approve Request and Authorize Release), and Manage Reports (with an include to Viewing Reports, which extends to Printing Report).

Volunteer
View Volunteer Dashboard, Screen Donor (with an include to Register Donor, which includes Check Donor Record, which further includes Eligibility Questionnaire), Blood Type Testing (with an include to Enter Hemoglobin Level), and Record Extraction (with include relationships to Record Extraction Details and QNS Classification, and will be triggered under the condition that extraction time is 15 minutes or more).

Blood Requestor
Register Account (available only under the condition that the user does not have an account yet), View Blood Availability, Submit Blood Request (with include relationships to Fill Patient Info, Select Blood Units, Upload Request Form, and Review and Submit), and Track Request Status.

Relationships
All four actors share a connection to the central Sign in use case. From Sign in, the system branches out to role-specific dashboards and home pages: View Admin Dashboard, View PRC Staff Dashboard, View Volunteer Dashboard, and Requestor Home Page, each reached through an include relationship. Solid lines represent direct actor-to-use-case associations. Dashed lines with open arrowheads represent either «include» relationships, where a use case is always triggered as part of another, or «extend» relationships, where a use case is triggered only under a specific condition. Condition notes are shown as bordered rectangles connected by dashed lines to the relevant use case.

Major Use Cases 
Sign in serves as the central shared entry point for all four actors. Every role must authenticate through Sign in before the system routes them to their respective dashboard or home page.

Manage User Accounts (Admin) covers the full lifecycle of user management. The admin can view accounts by role, add new users, deactivate or reactivate existing accounts, and edit account details.

Manage Blood Drives (Admin) allows the admin to monitor active drives and create new ones. Creating a drive includes scheduling it with a venue and date, and further includes assigning volunteers and phlebotomists to the drive.

Process Blood Requests (PRC Staff) handles the end-to-end workflow for incoming blood requests. Staff review and approve submitted requests, then authorize the release of blood units once payment has been confirmed.

Screen Donor (Volunteer) manages the donor intake process at a blood drive. It includes registering the donor, checking whether they have an existing record, and administering the eligibility questionnaire to determine if the donor may proceed.

Record Extraction (Volunteer) captures the details of the blood extraction. If the extraction duration reaches 15 minutes or more, the system triggers the QNS Classification use case to flag the unit as Quantity Not Sufficient.

Submit Blood Request (Blood Requestor) walks the requestor through a multi-step process: filling in patient information, selecting the required blood units, uploading the official request form, and reviewing the full summary before final submission.
							
System Architecture and Design	
The proposed Blood Donation, Donor Monitoring, and Blood Bank Inventory Application with Analytics is a web-based system designed to improve the management of donor records, blood inventory, and blood requests for selected Philippine Red Cross Batangas branches.

The system is intended for four types of users: Admin, PRC staff, Volunteer, and Requestor. Each user has specific access to system features based on their role.

The system addresses the current problems of manual and Excel-based processes by introducing a centralized digital platform. It provides a unified donor identification system, real-time inventory monitoring, and basic analytics to support decision-making. This improves data accuracy, reduces delays, and enhances coordination between branches.

The system follows a Three-Tier Architecture which consists of the following layers:

Presentation Layer (Frontend)
Application Layer (Backend)
Data Layer (Database)

This architecture was chosen because it is simple, efficient, and suitable for small-to-medium web applications like the proposed system.

Architecture Diagram

Figure 3: Architecture Diagram

The system follows a Three-Tier Architecture divided into the Presentation Layer, Application Layer, and Data Layer.

At the Presentation Layer, four types of clients access the system: Admin, PRC Staff, Volunteer, and Requestor. All four are directed to the Login Page upon accessing the system. The Login Page passes the user credentials down to the Application Layer for verification.

At the Application Layer, Session-Based Authentication receives the credentials from the Login Page, validates them, and redirects the user to their assigned dashboard based on their role. The four dashboards are the Admin Dashboard, PRC Staff Dashboard, Volunteer Dashboard, and Requestor Dashboard. Each dashboard only displays the functions relevant to that role.

From the Admin Dashboard, the user manages users, branches, hospitals, and system oversight.

From the PRC Staff Dashboard, the user can access Blood Unit Inventory, which tracks all available blood units by type and component, Inventory Alerts, which monitors low stock and near expiring units, and Analytics and Reports, which generates donation and inventory statistics.

From the Volunteer Dashboard, the user can access Donor Registration and Records, which handles adding and searching donor information, and Blood Collection Recording, which logs each blood donation and adds a new blood unit to the inventory.

From the Requestor Dashboard, the user can access Blood Request Processing, where blood requests are submitted, reviewed, and processed by PRC Staff. The status of each request is updated throughout the workflow from Pending to Ongoing to Ready or Denied.

All modules in the Application Layer communicate with the MySQL Database at the Data Layer to read and write data. The database stores all system records including donors, blood units, requests, users, and notifications. Data retrieved from the database is passed back up through the Application Layer and displayed to the user through their respective dashboard.


Figure 4: Level 0 Data Flow Diagram

The Context Diagram presents the system as a single process representing the entire PRC Blood Donation and Inventory System. It shows the four external entities that interact with the system and the data that flows between them.

The Admin sends user credentials, user account details, branch information, and hospital information into the system. In return, the system provides the Admin with system overview reports and user management confirmations.

The PRC Staff sends login credentials, blood request decisions, and blood unit deduction confirmations into the system. The system returns incoming blood requests, inventory status and alerts, and analytics and reports to the PRC Staff.

The Volunteer sends login credentials, donor information, and donation details into the system. The system returns donor records, donation confirmations, and blood unit added confirmations to the Volunteer.

The Requestor sends login credentials, a blood request form, and an official hospital document into the system. The system returns a request status update, a payment reference, and a request confirmation to the Requestor.


Figure 6: Level 1 Data Flow Diagram

The Level 1 DFD breaks down the system into seven major processes, four external entities, and six data stores, showing how data moves through each function of the system.

P1: User Authentication
All four external entities, Admin, PRC Staff, Volunteer, and Requestor, send their login credentials to the User Authentication process. This process reads user account data from the Users data store to verify the credentials. If valid, the process creates a session and redirects the user to their assigned dashboard. If invalid, an error message is returned to the user.

P2: Donor Registration and Records
The Volunteer sends donor information to the Donor Registration and Records process. This process checks the Donors data store for existing records to prevent duplicate entries. If the donor does not exist, a new record is written to the Donors data store. If the donor already exists, the existing record is retrieved and returned to the Volunteer.

P3: Blood Collection Recording
The Volunteer sends donation details to the Blood Collection Recording process. This process writes the donation record to the Donations data store and automatically sends a new blood unit entry to the Blood Units data store. A donation confirmation is returned to the Volunteer.
P4: Blood Unit Inventory
The PRC Staff accesses the Blood Unit Inventory process to view and manage blood units. This process reads from and writes to the Blood Units data store. It returns the current inventory status including blood type, component, expiration date, and availability to the PRC Staff Dashboard.

P5: Blood Request Processing
The Requestor sends a blood request form and hospital document to the Blood Request Processing process. This process writes the request to the Blood Requests data store and notifies the PRC Staff of the incoming request. The PRC Staff sends a decision to accept or deny the request back to this process. If accepted, the process updates the Blood Requests data store with a reservation and deduction record, updates the Blood Units data store to reflect the removed units, and sends a status update and confirmation to the Requestor through the Notifications data store.

P6: Inventory Alerts
The Inventory Alerts process continuously reads from the Blood Units data store to monitor stock levels and expiration dates. When a blood type falls below the minimum stock level or a unit is close to expiring, this process writes an alert to the Notifications data store and displays it on the PRC Staff Dashboard.

P7: Analytics and Reports
The Analytics and Reports process reads data from the Donors, Donations, Blood Units, and Blood Requests data stores to generate statistics and reports. The results are returned to the PRC Staff Dashboard and the Admin Dashboard for viewing.


Figure 7: Entity Relationship Diagram

The Entity Relationship Diagram (ERD) shows the structure and relationships of the fourteen core tables in the prc_blood_system database.

The roles table stores the four user roles in the system and is connected to the users table, where each user is assigned exactly one role. The branches table stores the PRC chapter locations and is connected to users, donations, blood_units, and blood_requests, meaning each of these records is associated with a specific branch.

The donors table stores donor information and is connected to the donations table, where one donor can have multiple donation records. The donations table is also connected to the users table through the staff_id field, identifying which staff member recorded the donation. Each donation record is connected to the blood_units table, where one donation produces one or more blood unit entries in the inventory.

The hospitals table stores the list of authorized hospitals and is connected to the requestors table. The requestors table stores the accounts of hospital representatives who submit blood requests, and is connected to the blood_requests table. Each blood request can have multiple request_items, which specify the blood type, component, and number of units being requested.

When a blood request is accepted by PRC Staff, a reservation record is created in the reservations table linked to the blood request. The reservation then generates a deduction request in the deduction_requests table, which is confirmed by a staff member to officially remove the blood units from inventory. The notifications table stores system alerts and messages for each user, linked through the user_id field.

Data Dictionary
This section presents the data dictionary which provides a comprehensive reference for all database tables used in the system, detailing the field names, data types, descriptions, and constraints that define the structure of each table. The system is composed of twenty-one tables, namely: blood_drive, blood_requests, blood_units, branches, component_expiry_days, donations, donors, donor_interview_answers, donor_interview_questions, hospitals, payments, phlebotomists, physical_examinations, prc_staff, pricing_components, requestors, request_items, roles, screening, users, and volunteers. Each table is designed to store a specific set of records that collectively support the core functionalities of the system, including donor management, blood collection and inventory, blood request processing, and branch operations. The relationships between these tables are established through primary and foreign keys, ensuring referential integrity and enabling efficient data retrieval across the different modules of the system.


Field Name
Data Type
Description
Constraints
drive_id
INT(11)
Unique identifier for the blood drive event
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
branch_id
INT(11)
Branch that organized the drive
FK → branches.branch_id, NULL
created_by
INT(11)
User who created the blood drive record
FK → users.user_id, NULL
title
VARCHAR(150)
Title/name of the blood drive event
NOT NULL
description
TEXT
Optional details or notes about the event
NULL
venue_name
VARCHAR(150)
Name of the venue where the drive is held
NOT NULL
venue_type
ENUM
Type of venue: school, hospital, community_center, church, government, other
NOT NULL, DEFAULT 'other'
building
VARCHAR(100)
Building name within the venue
NULL
floor_room
VARCHAR(100)
Floor or room number within the building
NULL
campus
VARCHAR(150)
Campus area of the venue (for schools)
NULL
street_address
VARCHAR(255)
Street address of the venue
NOT NULL
city
VARCHAR(100)
City where the venue is located
NOT NULL
province
VARCHAR(100)
Province where the venue is located
NOT NULL, DEFAULT 'Batangas'
postal_code
VARCHAR(10)
Postal/ZIP code of the venue
NULL
event_date
DATE
Scheduled date of the blood drive
NOT NULL
start_time
TIME
Start time of the blood drive
NOT NULL
end_time
TIME
End time of the blood drive
NOT NULL
slots_available
INT(11)
Number of donor slots available for the event
NULL
contact_person
VARCHAR(100)
Name of the event contact person
NULL
contact_number
VARCHAR(20)
Phone number of the event contact person
NULL
contact_email
VARCHAR(150)
Email address of the event contact person
NULL
status
ENUM
Current status: upcoming, ongoing, completed, cancelled
NOT NULL, DEFAULT 'upcoming'
is_published
TINYINT(1)
Whether the event is visible to the public (1=Yes)
NOT NULL, DEFAULT 0
created_at
TIMESTAMP
Timestamp when the record was created
NOT NULL, DEFAULT CURRENT_TIMESTAMP


Table 4.1: Data Dictionary for table “blood_drive” 

The blood_drive table stores all records of blood drive events organized by PRC branches, connected to the branches table through the branch_id field and to the users table through the created_by field, identifying which branch organized the event and which staff member created the record. Each record is uniquely identified by an auto-generated drive_id and carries the event's title, description, and status, which tracks whether the event is upcoming, ongoing, completed, or cancelled, defaulting to upcoming. The is_published field controls public visibility of the event, where a value of 1 indicates it has been published. Venue information is captured through the venue_name and venue_type fields, where the type can be a school, hospital, community center, church, government facility, or other, supplemented by optional fields such as building, floor_room, and campus, along with the complete address fields street_address, city, province, and postal_code, with the province defaulting to Batangas. The event_date, start_time, and end_time fields define the schedule of the drive, while slots_available stores the number of donor slots allotted for the event. The contact_person, contact_number, and contact_email fields store the details of the designated event contact, and the created_at field automatically records the timestamp at which the record was created in the system.

Field Name
Data Type
Description
Constraints
request_id
INT(11)
Unique identifier for the blood request
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
requestor_id
INT(11)
Requestor who filed the request
FK → requestors.requestor_id, NULL
last_name
VARCHAR(100)
last name of the patient needing blood
NULL
first_name
VARCHAR(100)
first name of the patient needing blood
NULL
patient_age
INT(11)
Age of the patient
NULL
hospital_id
INT(11)
Hospital where the blood is needed
FK → hospitals.hospital_id, NULL
branch_id
INT(11)
PRC branch processing the request
FK → branches.branch_id, NULL
request_type
VARCHAR(20)
Type of request: STAT (urgent) or Routine
NULL
status
VARCHAR(50)
Current request status (Submitted, Approved, Declined, etc.)
NULL
urgency_notes
TEXT
Notes explaining the urgency of the request
NULL
denial_reason
TEXT
Reason for denial if the request was declined
NULL
approved_at
DATETIME
Timestamp when the request was approved
NULL
document_path
VARCHAR(255)
File path to the supporting document uploaded by requestor
NULL
created_at
TIMESTAMP
Timestamp when the request was created
NOT NULL, DEFAULT CURRENT_TIMESTAMP
updated_at
DATETIME
Timestamp when the request was last updated
NULL


Table 4.2: Data Dictionary for table “blood_requests” 

The blood_requests table stores all blood request records submitted by hospital representatives to PRC branches, connected to the requestors table through the requestor_id field, the hospitals table through the hospital_id field, and the branches table through the branch_id field, identifying who filed the request, which hospital the blood is needed for, and which branch is processing it. Each record is uniquely identified by an auto-generated request_id and captures the patient's details through the last_name, first_name, and patient_age fields. The request_type field classifies the request as either STAT, indicating urgency, or Routine, while the urgency_notes field provides additional context explaining the urgency of the request. The status field tracks the current state of the request, which can be set to Submitted, Approved, Declined, or other applicable statuses, and the denial_reason field stores the reason provided by the staff should the request be declined. The document_path field stores the file path to the supporting document uploaded by the requestor as part of the request submission. The approved_at field records the timestamp when the request was officially approved, while the created_at field automatically captures when the record was first created in the system, and the updated_at field logs the most recent timestamp at which the record was modified.


Field Name
Data Type
Description
Constraints
unit_id
INT(11)
Unique identifier for the blood unit
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
ticket_id
INT(11)
Linked donation ticket, if applicable
FK → blood_unit_tickets.ticket_id, NULL
donor_id
INT(11)
Donor who donated this unit
NULL
extraction_date
DATETIME
Date and time blood was extracted
NULL
phlebotomist_id
INT(11)
ID of the phlebotomist who extracted the blood
NULL
phlebotomist_name
VARCHAR(100)
Name of the phlebotomist
NULL
barcode
VARCHAR(100)
Unique barcode identifier for the blood bag
UNIQUE, NULL
qr_code
VARCHAR(255)
QR code data for the blood bag
NULL
donation_id
INT(11)
Associated donation record
FK → donations.donation_id, NULL
blood_type
VARCHAR(5)
ABO/Rh blood type (e.g., O+, A-, AB+)
NULL
component
VARCHAR(50)
Blood component (Whole Blood, PRBC, FFP, Platelet, etc.)
NULL
volume_ml
INT(11)
Volume of blood in milliliters
DEFAULT 450
expiration_date
DATE
Date when the unit expires
NULL
status
VARCHAR(50)
Current status: Available, Reserved, Expired, Deducted, etc.
NULL
created_at
TIMESTAMP
Timestamp when the unit was added to inventory
NOT NULL, DEFAULT CURRENT_TIMESTAMP
updated_at
DATETIME
Timestamp when the unit record was last updated
NULL
branch_id
INT(11)
Branch holding this blood unit
FK → branches.branch_id, NULL
price
DECIMAL(10,2)
Price of the blood unit
NULL
disposal_reason
TEXT
Reason the unit was disposed of
NULL
withdrawal_reason
TEXT
Reason the unit was withdrawn from inventory
NULL
qns_reason
VARCHAR(255)
Reason for quantity not sufficient (QNS) flagging
NULL
is_qns
TINYINT(1)
Flag if unit was marked as quantity not sufficient
NOT NULL, DEFAULT 0


Table 4.3: Data Dictionary for table “blood_units” 

The blood_units table stores all individual blood unit records held in the inventory of each PRC branch, connected to the blood_unit_tickets table through the ticket_id field, the donations table through the donation_id field, and the branches table through the branch_id field, identifying the associated donation ticket, the donation record that produced the unit, and the branch currently holding it. Each record is uniquely identified by an auto-generated unit_id and carries the donor_id field to reference the donor who contributed the unit. The extraction details are captured through the extraction_date, phlebotomist_id, and phlebotomist_name fields, identifying when the blood was extracted and who performed the procedure. Each unit is individually traceable through the barcode and qr_code fields, which serve as unique physical identifiers for the blood bag. The blood_type and component fields classify the unit by its ABO/Rh type and its derived component, such as Whole Blood, PRBC, FFP, or Platelet, while the volume_ml field records the volume in milliliters, defaulting to 450. The expiration_date field stores the date on which the unit expires, and the status field reflects its current state in the inventory, which can be set to Available, Reserved, Expired, Deducted, or other applicable statuses. The price field stores the corresponding cost of the blood unit. Units that are removed from inventory are documented through the disposal_reason and withdrawal_reason fields, while the is_qns flag marks whether a unit was flagged as quantity not sufficient, with the qns_reason field providing the corresponding explanation. Finally, the created_at field automatically records when the unit was added to the inventory, and the updated_at field logs the most recent timestamp at which the record was modified.

Field Name
Data Type
Description
Constraints
branch_id
INT(11)
Unique identifier for the branch
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
branch_name
VARCHAR(100)
Name of the PRC branch office
NULL
location
VARCHAR(150)
Physical location of the branch
NULL


Table 4.4: Data Dictionary for table “branches” 

The branches table stores all PRC branch office records in the system and serves as a central reference connected to multiple other tables, including users, donations, blood_units, and blood_requests, meaning each of these records is associated with a specific branch. Each record is uniquely identified by an auto-generated branch_id and carries the branch_name field, which stores the name of the PRC branch office, and the location field, which stores its corresponding physical address.

Field Name
Data Type
Description
Constraints
expiry_id
INT(11)
Unique identifier for the expiry rule
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
component
VARCHAR(100)
Name of the blood component
NOT NULL, UNIQUE
expiry_days
INT(11)
Number of days from extraction date until the unit expires
NOT NULL
updated_by
INT(11)
User who last updated this expiry configuration
FK → users.user_id, NULL
updated_at
TIMESTAMP
Timestamp when the record was last updated
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE


Table 4.5: Data Dictionary for table “component_expiry_days” 

The component_expiry_days table stores the expiry rules configured for each blood component in the system and is connected to the users table through the updated_by field, identifying which staff member last modified the configuration. Each record is uniquely identified by an auto-generated expiry_id and carries the component field, which stores the name of the blood component and is marked as unique to ensure that only one expiry rule exists per component. The expiry_days field defines the number of days from the extraction date after which a blood unit of that component is considered expired, serving as the basis for computing the expiration dates of blood units stored in the inventory. The updated_at field automatically records the timestamp of the most recent update made to the record, refreshing each time a modification is applied.

Field Name
Data Type
Description
Constraints
donation_id
INT(11)
Unique identifier for the donation
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
donor_id
INT(11)
Donor who made this donation
FK → donors.donor_id, NULL
branch_id
INT(11)
Branch where the donation occurred
FK → branches.branch_id, NULL
screening_id
INT(11)
Associated pre-donation screening record
FK → screening.screening_id, NULL
extraction_date
DATETIME
Date and time of blood extraction
NULL
staff_id
INT(11)
Staff member who recorded the donation
FK → users.user_id, NULL
phlebotomist_name
VARCHAR(100)
Name of the phlebotomist who extracted blood
NULL
phlebotomist_identifier
VARCHAR(100)
Identifier or license number of the phlebotomist
NULL
blood_volume_ml
INT(11)
Volume of blood collected in milliliters
DEFAULT 450
reaction_notes
TEXT
Notes on any adverse donor reactions during collection
NULL
recorded_by
INT(11)
Staff who recorded this donation entry
NULL
created_at
TIMESTAMP
Timestamp when the donation was recorded
NOT NULL, DEFAULT CURRENT_TIMESTAMP
extraction_time_minutes
INT(11)
Duration of extraction in minutes
NULL
extraction_time
TIME
Time of day when extraction was performed
NULL
is_qns
TINYINT(1)
Flag if quantity was not sufficient
NOT NULL, DEFAULT 0
qns_reason
VARCHAR(255)
Reason for quantity not sufficient
NULL


Table 4.6: Data Dictionary for table “donations” 

The donations table stores all blood donation records processed by PRC branches, connected to the donors table through the donor_id field, the branches table through the branch_id field, the screening table through the screening_id field, and the users table through the staff_id field, identifying the donor who made the donation, the branch where it occurred, the associated pre-donation screening record, and the staff member who recorded it. Each record is uniquely identified by an auto-generated donation_id and captures the extraction details through the extraction_date, extraction_time, and extraction_time_minutes fields, which together document when and how long the extraction procedure took place. The phlebotomist who performed the extraction is identified through the phlebotomist_name and phlebotomist_identifier fields, where the identifier stores the phlebotomist's license number or equivalent credential. The blood_volume_ml field records the volume of blood collected in milliliters, defaulting to 450, while the reaction_notes field captures any adverse reactions observed from the donor during the collection process. The recorded_by field identifies the staff member who entered the donation record into the system. The is_qns flag marks whether the collected volume was insufficient, with the qns_reason field providing the corresponding explanation for the flagging. Finally, the created_at field automatically records the timestamp at which the donation entry was created in the system.

Field Name
Data Type
Description
Constraints
donor_id
INT(11)
Unique identifier for the donor
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
unique_code
VARCHAR(50)
System-generated unique donor code (e.g., DNR-2026-0001)
UNIQUE, NULL
first_name
VARCHAR(50)
Donor's first name
NULL
middle_name
VARCHAR(50)
Donor's middle name
NULL
last_name
VARCHAR(50)
Donor's last name
NULL
suffix
VARCHAR(10)
Name suffix (Jr., Sr., etc.)
NULL
birthdate
DATE
Donor's date of birth
NULL
sex
VARCHAR(10)
Donor's biological sex (Male/Female)
NULL
blood_type
VARCHAR(5)
Donor's ABO/Rh blood type
NULL
contact
VARCHAR(50)
Donor's contact/mobile number
NULL
email
VARCHAR(100)
Donor's email address
NULL
address
TEXT
Full address as a single text field
NULL
address_no
VARCHAR(30)
House/unit number
NULL
address_street
VARCHAR(100)
Street name
NULL
address_brgy
VARCHAR(100)
Barangay
NULL
address_municipality
VARCHAR(100)
Municipality
NULL
address_province_city
VARCHAR(100)
Province or city
NULL
city
VARCHAR(100)
City of residence
NULL
province
VARCHAR(100)
Province of residence
NULL
zip_code
VARCHAR(10)
ZIP/postal code
NULL
national_id_type
VARCHAR(50)
Type of national ID presented
NULL
national_id_number
VARCHAR(50)
National ID number
NULL, UNIQUE with national_id_type
emergency_contact_name
VARCHAR(100)
Name of emergency contact person
NULL
emergency_contact_phone
VARCHAR(20)
Phone number of emergency contact
NULL
emergency_contact
VARCHAR(50)
Legacy emergency contact name field
NULL
emergency_phone
VARCHAR(20)
Legacy emergency contact phone field
NULL
last_donation_date
DATE
Date of the donor's most recent donation
NULL
total_donations
INT(11)
Total number of successful donations by this donor
DEFAULT 0
status
VARCHAR(20)
Donor account status (Active, Inactive)
DEFAULT 'Active'
password
VARCHAR(255)
Hashed password for donor portal login
NULL
last_login
DATETIME
Timestamp of the donor's last portal login
NULL
created_at
TIMESTAMP
Timestamp when the donor record was created
NOT NULL, DEFAULT CURRENT_TIMESTAMP
nationality
VARCHAR(50)
Donor's nationality
NULL
religion
VARCHAR(50)
Donor's religion
NULL
education
VARCHAR(50)
Donor's highest education level
NULL
occupation
VARCHAR(100)
Donor's occupation
NULL


Table 4.7: Data Dictionary for table “donors” 

The donors table stores all registered donor records in the system and is connected to the donations table, where one donor can have multiple donation records. Each record is uniquely identified by an auto-generated donor_id and is assigned a system-generated unique_code following a structured format such as DNR-2026-0001. The donor's personal information is captured through the first_name, middle_name, last_name, and suffix fields, along with the birthdate, sex, blood_type, and nationality fields. Additional demographic details such as religion, education, and occupation are also recorded as supplementary profile information. Contact details are stored through the contact, email, and zip_code fields, while the donor's address is documented through a combination of structured fields including address_no, address_street, address_brgy, address_municipality, address_province_city, city, and province, alongside a consolidated address field that stores the full address as a single text entry. Identity verification is handled through the national_id_type and national_id_number fields, where the combination of both is enforced as unique. Emergency contact information is stored through the emergency_contact_name and emergency_contact_phone fields, with emergency_contact and emergency_phone retained as legacy fields from an earlier version of the system. Donation history is tracked through the last_donation_date and total_donations fields, where the latter defaults to zero upon registration. The status field reflects the donor's current account standing, defaulting to Active, while the password field stores the hashed credentials used for donor portal login and the last_login field records the most recent portal access. Finally, the created_at field automatically records the timestamp at which the donor record was created in the system.

Field Name
Data Type
Description
Constraints
answer_id
INT(11)
Unique identifier for the answer record
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
donation_id
INT(11)
Associated donation session, if applicable
FK → donations.donation_id, NULL
donor_id
INT(11)
Donor who answered the question
FK → donors.donor_id, NULL
question_id
INT(11)
Interview question being answered
FK → donor_interview_questions.question_id, NULL
answer
ENUM(YES,NO)
Donor's answer to the question
NOT NULL
created_at
TIMESTAMP
Timestamp when the answer was recorded
NOT NULL, DEFAULT CURRENT_TIMESTAMP


Table 4.8: Data Dictionary for table “donor_interview_answers” 

The donor_interview_answers table stores the recorded answers of donors to pre-donation interview questions, connected to the donations table through the donation_id field, the donors table through the donor_id field, and the donor_interview_questions table through the question_id field, identifying the donation session the interview is associated with, the donor who provided the answers, and the specific question being responded to. Each record is uniquely identified by an auto-generated answer_id and captures the donor's response through the answer field, which is restricted to either YES or NO. Finally, the created_at field automatically records the timestamp at which the answer entry was created in the system.

Field Name
Data Type
Description
Constraints
question_id
INT(11)
Unique identifier for the question
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
question_number
VARCHAR(10)
Reference number (e.g., 1.1, 2.4) following PRC format
NOT NULL, UNIQUE
question_text
TEXT
Full text of the screening question
NOT NULL
sex_filter
ENUM
Which donors see this question: Male, Female, or Both
NOT NULL, DEFAULT 'Both'
defer_if
ENUM(YES,NO)
Whether a YES or NO answer triggers a deferral
NOT NULL
deferral_reason
VARCHAR(255)
Explanation of why this answer defers the donor
NULL
deferral_type
ENUM
Type of deferral: temporary or permanent
NULL
deferral_duration
VARCHAR(50)
Duration or description of the deferral period
NULL
is_active
TINYINT(1)
Whether this question is currently in use (1=Active)
NOT NULL, DEFAULT 1
sort_order
INT(11)
Display order of the question in the interview form
NOT NULL, DEFAULT 0


Table 4.9: Data Dictionary for table “donor_interview_questions” 

The donor_interview_questions table stores all pre-donation interview questions used during the donor screening process and is connected to the donor_interview_answers table, where each question can have multiple recorded answers from different donors across various donation sessions. Each record is uniquely identified by an auto-generated question_id and is assigned a question_number following the PRC reference format, such as 1.1 or 2.4, which is enforced as unique. The full text of the question is stored in the question_text field, while the sex_filter field determines which donors are presented with the question, restricting visibility to Male, Female, or Both, defaulting to Both. The deferral logic of each question is defined through the defer_if field, which specifies whether a YES or NO answer triggers a deferral, and the deferral_reason field, which provides the explanation for why that response results in a deferral. The deferral_type field classifies the deferral as either temporary or permanent, and the deferral_duration field describes the length or conditions of the deferral period. The is_active flag controls whether the question is currently in use within the interview form, where a value of 1 indicates it is active, and the sort_order field defines the display order in which the question appears during the interview, defaulting to 0.

Field Name
Data Type
Description
Constraints
hospital_id
INT(11)
Unique identifier for the hospital
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
hospital_name
VARCHAR(150)
Name of the hospital or medical facility
NULL
location
VARCHAR(150)
City or municipality of the hospital
NULL


Table 4.10: Data Dictionary for table “hospitals” 

The hospitals table stores all registered hospital and medical facility records in the system and serves as a reference connected to the requestors table, where each requestor account is associated with a specific hospital, and to the blood_requests table, identifying which hospital a blood request is being made for. Each record is uniquely identified by an auto-generated hospital_id and carries the hospital_name field, which stores the name of the hospital or medical facility, and the location field, which stores its corresponding city or municipality.

Field Name
Data Type
Description
Constraints
phlebotomist_id
INT(11)
Unique identifier for the phlebotomist
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
user_id
INT(11)
Linked system user account, if applicable
FK → users.user_id (via branch_id), NULL
first_name
VARCHAR(50)
Phlebotomist's first name
NOT NULL
last_name
VARCHAR(50)
Phlebotomist's last name
NOT NULL
license_number
VARCHAR(50)
Professional license number
NULL
email
VARCHAR(100)
Email address
NULL
contact
VARCHAR(20)
Contact/mobile number
NULL
branch_id
INT(11)
Branch the phlebotomist is assigned to
NULL
status
VARCHAR(20)
Employment/availability status
DEFAULT 'Active'
created_at
TIMESTAMP
Timestamp when the record was created
NOT NULL, DEFAULT CURRENT_TIMESTAMP


Table 4.11: Data Dictionary for table “phlebotomists” 

The phlebotomists table stores all registered phlebotomist records in the system and is connected to the users table through the user_id field, identifying whether the phlebotomist has a linked system user account. Each record is uniquely identified by an auto-generated phlebotomist_id and captures the phlebotomist's personal information through the first_name and last_name fields, along with their professional credentials through the license_number field. Contact details are stored through the email and contact fields. The branch_id field identifies the PRC branch to which the phlebotomist is currently assigned. The status field reflects the phlebotomist's current employment or availability standing, defaulting to Active. Finally, the created_at field automatically records the timestamp at which the phlebotomist record was created in the system.

Field Name
Data Type
Description
Constraints
exam_id
INT(11)
Unique identifier for the examination record
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
donation_id
INT(11)
Associated donation session
FK → donations.donation_id, NULL
donor_id
INT(11)
Donor who was examined
FK → donors.donor_id, NULL
screening_id
INT(11)
Linked screening session
FK (via comment), NULL, UNIQUE
temperature
DECIMAL(4,1)
Body temperature in Celsius
NULL
pulse_rate
INT(11)
Pulse rate in beats per minute
NULL
blood_pressure_systolic
INT(11)
Systolic blood pressure reading
NULL
blood_pressure_diastolic
INT(11)
Diastolic blood pressure reading
NULL
hemoglobin
DECIMAL(4,2)
Hemoglobin level in g/dL
NULL
hemo_status
ENUM
Hemoglobin eligibility result: Allowed, Not Allowed
NULL
blood_type_confirmed
VARCHAR(5)
Blood type as confirmed during examination
NULL
notes
TEXT
Additional examination notes
NULL
created_at
TIMESTAMP
Timestamp when the examination was recorded
NOT NULL, DEFAULT CURRENT_TIMESTAMP


Table 4.12: Data Dictionary for table “physical_examinations” 

The physical_examinations table stores all physical examination records conducted during the pre-donation process, connected to the donations table through the donation_id field, the donors table through the donor_id field, and the screening table through the screening_id field, identifying the donation session the examination is associated with, the donor who was examined, and the linked screening session. Each record is uniquely identified by an auto-generated exam_id and captures the donor's vital signs through the temperature, pulse_rate, blood_pressure_systolic, and blood_pressure_diastolic fields, which together document the donor's physical condition at the time of examination. The hemoglobin field records the donor's hemoglobin level in g/dL, and the hemo_status field reflects the eligibility result based on that reading, which can be set to either Allowed or Not Allowed. The blood_type_confirmed field stores the donor's blood type as verified during the examination, which may be used to validate the blood type already recorded in the donor's profile. The notes field captures any additional observations or remarks made by the examining staff. Finally, the created_at field automatically records the timestamp at which the examination record was created in the system.

Field Name
Data Type
Description
Constraints
staff_id
INT(11)
Unique identifier for the staff member
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
user_id
INT(11)
Linked system user account
FK → users.user_id, NULL
branch_id
INT(11)
Branch the staff member is assigned to
FK → branches.branch_id, NULL
first_name
VARCHAR(50)
Staff member's first name
NOT NULL
last_name
VARCHAR(50)
Staff member's last name
NOT NULL
birthdate
DATE
Staff member's date of birth
NULL
profile_img
VARCHAR(255)
File path to the staff member's profile image
NULL
middle_name
VARCHAR(50)
Staff member's middle name
NULL
email
VARCHAR(100)
Staff member's email address
NULL
contact
VARCHAR(20)
Staff member's contact number
NULL
position
VARCHAR(100)
Job position or title
NULL
status
VARCHAR(20)
Employment status
DEFAULT 'Active'
created_at
TIMESTAMP
Timestamp when the record was created
NOT NULL, DEFAULT CURRENT_TIMESTAMP
admin_created_id
INT(11)
ID of the admin who created this staff record
NULL


Table 4.13: Data Dictionary for table “prc_staff” 

The prc_staff table stores all registered PRC staff member records in the system, connected to the users table through the user_id field and the branches table through the branch_id field, identifying the linked system user account of the staff member and the branch to which they are assigned. Each record is uniquely identified by an auto-generated staff_id and captures the staff member's personal information through the first_name, middle_name, and last_name fields, along with their birthdate. Contact details are stored through the email and contact fields, while the profile_img field stores the file path to the staff member's uploaded profile image. The position field records the staff member's job title or designation within the branch, and the status field reflects their current employment standing, defaulting to Active. The admin_created_id field identifies the administrator who created the staff record in the system. Finally, the created_at field automatically records the timestamp at which the staff record was created in the system.

Field Name
Data Type
Description
Constraints
component_id
INT(11)
Unique identifier for the pricing record
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
component
VARCHAR(100)
Name of the blood component
NOT NULL, UNIQUE
price
DECIMAL(10,2)
Price charged per unit of this component
NOT NULL
is_active
TINYINT(1)
Whether this component appears in request forms (1=Yes)
NOT NULL, DEFAULT 1
updated_by
INT(11)
User who last updated this price
FK → users.user_id, NULL
updated_at
TIMESTAMP
Timestamp when the price was last updated
NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE


Table 4.14: Data Dictionary for table “pricing components” 

The pricing_components table stores the configured pricing records for each blood component in the system and is connected to the users table through the updated_by field, identifying which staff member last modified the pricing configuration. Each record is uniquely identified by an auto-generated component_id and carries the component field, which stores the name of the blood component and is enforced as unique to ensure that only one pricing record exists per component. The price field stores the corresponding amount charged per unit of that component, while the is_active flag controls whether the component appears in blood request forms, where a value of 1 indicates it is currently active. Finally, the updated_at field automatically records the timestamp of the most recent update made to the record, refreshing each time a modification is applied.

Field Name
Data Type
Description
Constraints
requestor_id
INT(11)
Unique identifier for the requestor
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
name
VARCHAR(100)
Full name of the requestor
NOT NULL
profile_img
VARCHAR(255)
File path to the requestor's profile image
NULL
first_name
VARCHAR(100)
Requestor's first name
NOT NULL, DEFAULT ''
last_name
VARCHAR(100)
Requestor's last name
NOT NULL, DEFAULT ''
birthdate
DATE
Requestor's date of birth
NULL
email
VARCHAR(100)
Requestor's email address (login credential)
NOT NULL, UNIQUE
contact
VARCHAR(20)
Requestor's contact number
NULL
password
VARCHAR(255)
Hashed password for portal login
NULL
status
VARCHAR(20)
Account status (Active, Inactive)
NOT NULL, DEFAULT 'Active'
last_login
DATETIME
Timestamp of the requestor's last login
NULL
login_attempts
TINYINT(3)
Number of consecutive failed login attempts
NOT NULL, DEFAULT 0, UNSIGNED
locked_until
DATETIME
Account locked until this timestamp after failed logins
NULL
hospital_id
INT(11)
Affiliated hospital of the requestor
FK → hospitals.hospital_id, NULL
created_at
TIMESTAMP
Timestamp when the account was created
NOT NULL, DEFAULT CURRENT_TIMESTAMP
admin_created_id
INT(11)
Admin who created this account, if applicable
NULL, UNIQUE
session_token
VARCHAR(64)
Active session token for authentication
NULL


Table 4.15: Data Dictionary for table “requestors” 

The requestors table stores all registered requestor accounts in the system and is connected to the hospitals table through the hospital_id field and to the blood_requests table, identifying the hospital the requestor is affiliated with and linking them to the blood requests they have submitted. Each record is uniquely identified by an auto-generated requestor_id and captures the requestor's personal information through the first_name, last_name, name, and birthdate fields, along with contact details stored through the email and contact fields, where the email address serves as the primary login credential and is enforced as unique. The profile_img field stores the file path to the requestor's uploaded profile image. Authentication and session management are handled through the password field, which stores the hashed login credentials, the session_token field, which holds the active session token, and the last_login field, which records the most recent login timestamp. Account security is further managed through the login_attempts field, which tracks the number of consecutive failed login attempts, and the locked_until field, which stores the timestamp until which the account remains locked following excessive failed attempts. The status field reflects the current standing of the requestor's account, defaulting to Active. The admin_created_id field identifies the administrator who created the account on behalf of the requestor, if applicable. Finally, the created_at field automatically records the timestamp at which the requestor account was created in the system.



Field Name
Data Type
Description
Constraints
item_id
INT(11)
Unique identifier for the request line item
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
request_id
INT(11)
Blood request this item belongs to
FK → blood_requests.request_id, NULL
blood_type
VARCHAR(5)
Required blood type (e.g., O+, A-)
NULL
component
VARCHAR(50)
Required blood component
NULL
units
INT(11)
Number of units requested
NULL
unit_price
DECIMAL(10,2)
Price per unit at the time of the request
NULL
total_price
DECIMAL(10,2)
Calculated total price (unit_price × units)
NULL


Table 4.16: Data Dictionary for table “request_items” 

The request_items table stores the individual line items of each blood request and is connected to the blood_requests table through the request_id field, identifying which blood request the item belongs to. Each record is uniquely identified by an auto-generated item_id and captures the specific blood requirement through the blood_type and component fields, which define the ABO/Rh type and the blood component being requested, respectively. The units field stores the number of units being requested for that particular line item, while the unit_price field records the price per unit at the time the request was made, and the total_price field stores the calculated amount derived from multiplying the unit price by the number of units requested.

Field Name
Data Type
Description
Constraints
role_id
INT(11)
Unique identifier for the role
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
role_name
VARCHAR(50)
Name of the role
NOT NULL


Table 4.17: Data Dictionary for table “roles” 

The roles table stores the user roles defined in the system and is connected to the users table, where each user is assigned exactly one role. Each record is uniquely identified by an auto-generated role_id and carries the role_name field, which stores the name of the role assigned to system users.

Field Name
Data Type
Description
Constraints
screening_id
INT(11)
Unique identifier for the screening record
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
donor_id
INT(11)
Donor who underwent screening
FK → donors.donor_id, NULL
branch_id
INT(11)
Branch where screening was conducted
NULL
session_id
INT(11)
Session identifier, if applicable
NULL
screening_date
DATETIME
Date and time of the screening
NULL
weight
DECIMAL(5,2)
Donor's weight in kilograms
NULL
blood_pressure
VARCHAR(20)
Blood pressure reading (e.g., 120/80)
NULL
hemoglobin
DECIMAL(4,2)
Hemoglobin level in g/dL
NULL
status
VARCHAR(50)
Screening outcome: Passed, Deferred
NULL
screening_result
ENUM
Eligibility result: Eligible or Deferred
NULL
recorded_by
INT(11)
Staff who recorded the screening
NULL


Table 4.18: Data Dictionary for table “screening” 

The screening table stores all pre-donation screening records conducted at PRC branches, connected to the donors table through the donor_id field, identifying the donor who underwent the screening process. Each record is uniquely identified by an auto-generated screening_id and carries the branch_id and session_id fields, which identify the branch where the screening was conducted and the associated session, respectively. The screening_date field records the date and time the screening took place. The donor's physical measurements are captured through the weight, blood_pressure, and hemoglobin fields, storing the donor's weight in kilograms, blood pressure reading, and hemoglobin level in g/dL at the time of screening. The eligibility outcome of the screening is reflected through the status field, which can be set to Passed or Deferred, and the screening_result field, which classifies the result as either Eligible or Deferred. The recorded_by field identifies the staff member who entered the screening record into the system. Finally, the created_at field automatically records the timestamp at which the screening record was created in the system.

Field Name
Data Type
Description
Constraints
user_id
INT(11)
Unique identifier for the user
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
role_id
INT(11)
Role assigned to the user
FK → roles.role_id, NULL
name
VARCHAR(100)
Full display name of the user
NULL
email
VARCHAR(100)
Email address used as login credential
NULL, UNIQUE
password
VARCHAR(255)
Hashed password
NULL
branch_id
INT(11)
Branch the user is assigned to
FK → branches.branch_id, NULL
is_active
TINYINT(1)
Whether the account is active (1=Active)
NOT NULL, DEFAULT 1
status
ENUM
Account status: new, active, inactive
NOT NULL, DEFAULT 'active'
last_login
DATETIME
Timestamp of the user's last login
NULL
created_at
TIMESTAMP
Timestamp when the account was created
NOT NULL, DEFAULT CURRENT_TIMESTAMP
admin_created_id
INT(11)
Admin who created this account, if applicable
NULL, UNIQUE
session_token
VARCHAR(64)
Active session token for authentication
NULL


Table 4.19: Data Dictionary for table “users” 

The users table stores all registered system user accounts and serves as a central reference connected to multiple other tables, including roles, branches, donations, and notifications, where each user is assigned a role, associated with a branch, and linked to records they have created or managed within the system. Each record is uniquely identified by an auto-generated user_id and captures the user's basic information through the name field, along with the email field, which serves as the primary login credential and is enforced as unique. Authentication and session management are handled through the password field, which stores the hashed login credentials, the session_token field, which holds the active session token, and the last_login field, which records the most recent login timestamp. The role_id field identifies the role assigned to the user, while the branch_id field identifies the PRC branch the user is associated with. Account standing is managed through the is_active flag, where a value of 1 indicates the account is active, and the status field, which classifies the account state as new, active, or inactive, defaulting to active. The admin_created_id field identifies the administrator who created the account on behalf of the user, if applicable. Finally, the created_at field automatically records the timestamp at which the user account was created in the system.

Field Name
Data Type
Description
Constraints
volunteer_id
INT(11)
Unique identifier for the volunteer
PRIMARY KEY, AUTO_INCREMENT, NOT NULL
user_id
INT(11)
Linked system user account
FK → users.user_id, NULL
first_name
VARCHAR(50)
Volunteer's first name
NOT NULL
last_name
VARCHAR(50)
Volunteer's last name
NOT NULL
birthdate
DATE
Volunteer's date of birth
NULL
profile_img
VARCHAR(255)
File path to the volunteer's profile image
NULL
email
VARCHAR(100)
Volunteer's email address
NULL
contact
VARCHAR(20)
Volunteer's contact number
NULL
branch_id
INT(11)
Branch the volunteer is assigned to
FK → branches.branch_id, NULL
status
VARCHAR(20)
Volunteer status (Active, Inactive)
DEFAULT 'Active'
created_at
TIMESTAMP
Timestamp when the volunteer record was created
NOT NULL, DEFAULT CURRENT_TIMESTAMP
admin_created_id
INT(11)
Admin who created this volunteer record
NULL


Table 4.20: Data Dictionary for table “volunteers” 

The volunteers table stores all registered volunteer records in the system, connected to the users table through the user_id field and the branches table through the branch_id field, identifying the linked system user account of the volunteer and the branch to which they are assigned. Each record is uniquely identified by an auto-generated volunteer_id and captures the volunteer's personal information through the first_name, last_name, and birthdate fields. Contact details are stored through the email and contact fields, while the profile_img field stores the file path to the volunteer's uploaded profile image. The status field reflects the volunteer's current standing, defaulting to Active. The admin_created_id field identifies the administrator who created the volunteer record in the system. Finally, the created_at field automatically records the timestamp at which the volunteer record was created in the system.

User Interface Design
This section presents the user interface design of the system, which provides a visual reference for all screens and pages accessible to each type of user. The system is composed of four user roles, namely: Admin, PRC Staff, Volunteer, and Blood Requestor. Each role is provided with a dedicated set of pages tailored to their specific functions and responsibilities within the system. The interfaces cover a wide range of functionalities including user account management, blood unit inventory tracking, blood drive scheduling, donor registration and eligibility screening, blood extraction recording, blood request processing, and report generation. Navigation and access to these pages are governed by role-based permissions, ensuring that each user interacts only with the features relevant to their role while maintaining the overall integrity and security of the system.

Figure 8: Login Page for PRC Staff, Admin, and Volunteers
This figure shows the staff login page for PRC staff, admins, and volunteers. It includes fields for email address and password, a "Sign In" button.


Figure 9.1: Admin: “Home” Page
This figure displays the admin dashboard showing active users, a pie chart of user roles, available blood units per branch, and a bar chart of blood inventory by branch and component.


Figure 9.2.1: Admin: View Blood Unit Page
This figure shows the blood units inventory page where admins can view all blood units. It includes filter options by branch and component, and a table displaying details such as barcode, blood type, component, volume, expiration date, branch, and status (Available, Reserved, or Expired).


Figure 9.2.2: Admin: Add Blood Unit Page 
This figure shows the form for adding a new blood unit to the inventory. It includes fields for blood bank branch, barcode, blood component, blood type, and volume (ml), along with an "Add Unit" button and a "Back to Units" option.


Figure 9.2.3: Admin: Withdraw Blood Unit Page
This figure shows the withdrawal page where admins can select a branch, filter available units by component and blood type, and view a list of withdrawable blood units with details like barcode, blood type, component, volume, expiration date, and an "Withdraw" action button.


Figure 9.3.1: Admin: Staff List Page
This figure shows the staff list page displaying PRC staff members with search functionality. It includes staff names, branches, and a detailed view panel showing full name, email, phone, location, branch, and membership date for a selected staff member.


Figure 9.3.2: Admin: Volunteer List Page
This figure shows the volunteer list page displaying all registered volunteers with search functionality. It includes volunteer names, branches, and action buttons for adding, editing, and deleting user accounts.


Figure 9.3.3: Admin: Requestor List Page

This figure shows the requestor list page displaying all registered blood requisitioners. It includes search functionality, requestor names and emails, contact details, last login timestamp, and a "Deactivate Account" button for account management.


Figure 9.3.4: Admin: Phlebotomist List Page
This figure shows the phlebotomist list page displaying all licensed phlebotomists with search functionality. It includes each phlebotomist's name, branch, license number, email, last login status, and action buttons for deactivating or editing their account.


Figure 9.4.1: Admin: Add Staff Page
This figure shows the form for adding a new staff member. It includes fields for first name, last name, email address, branch, date of birth, and an automatically generated password. It also displays the most recently added staff member and a "Create Staff Account" button.


Figure 9.4.2: Admin: Add Volunteer Page
This figure shows the form for adding a new volunteer. It includes fields for first name, last name, email address, optional branch assignment, date of birth, and an automatically generated password. It also displays the most recently added volunteer and a "Create Volunteer Account" button.


Figure 9.4.3: Admin: Add Requestor Page
This figure shows the form for adding a new blood requester. It includes fields for first name, last name, email address, date of birth, and an automatically generated password. It also displays the most recently added requester and a "Create Requester Account" button.

Figure 9.4.4: Admin: Add Phlebotomist Page
This figure shows the form for adding a new phlebotomist. It includes fields for first name, last name, email address, license number, and branch assignment. It also displays the most recently added phlebotomist and an "Add" button.


Figure 9.5.1: Admin: Active Drives Page
This figure shows the blood drive details page displaying an upcoming drive. It includes drive information (branch, creator, creation time), venue details (name, type, campus, floor, address), and sections for assigning volunteers and phlebotomists.


Figure 9.5.2: Admin: Create Blood Drive Page
This figure shows the form for scheduling a new blood donation campaign. It includes fields for drive title, description, branch, event date, start time, end time, and venue details such as venue name and campus/building.


Figure 9.5.3: Admin: Blood Drive History Page
This figure shows the blood drive history page displaying all recorded donation campaigns. It includes tabs for filtering drives by status (Upcoming, Ongoing, Completed, Cancelled), search functionality, branch filters, and a list area showing drives matching the applied filters.


Figure 10.1: PRC Staff: Dashboard Page
This figure shows the PRC staff dashboard displaying key metrics including blood units, blood requests, blood releases, received blood, and reports. It also includes current stock by component (Fresh Frozen Plasma, Packed Red Blood Cells, Whole Blood) and a pie chart showing blood status breakdown (Safe, Near Expiry, Expired).


Figure 10.2.1: PRC Staff: View Current Units Page
This figure shows the blood inventory page displaying current available units across branches (PRC Batangas City, Lipa, Nasugbu, Tanauan) with component counts. It includes summary indicators for safe units, expiring units (≤3 days), and expired units. A filterable table lists unit details including barcode, blood type, component, status (Expired/Removed), and expiration date.



Figure 10.2.2: PRC Staff: Add New Blood Unit Page
This figure shows the form for adding a new blood unit to the inventory. It includes fields for unit barcode, blood type, date collected, branch, optional registered donor, and phlebotomist name. A live preview section displays component type, shelf life remaining, collection and expiration dates, and unit status.

Figure 10.2.3: PRC Staff: Withdraw/Dispose Page
This figure shows the withdraw and dispose page for managing blood unit disposal and withdrawal requests. It includes sections for disposing expired and near-expiry units, a searchable withdrawal list with unit details (barcode, blood type, component, expiration date, status), and a form for selecting a withdrawal reason and adding optional notes.


Figure 10.3.1: PRC Staff: Blood Request Page
This figure shows the blood request page displaying active incoming blood requests. Each request includes the requester name, hospital or clinic, blood type, and component needed, along with a status indicator. This is a first-come, first-serve basis.


Figure 10.3.2: PRC Staff: Blood Request Information Page
This figure shows the blood request form page displaying patient information, requested blood units with quantity and price, stock availability, and reserved units. It includes a summary of total units and total amount, along with approval and submission dates, and an action button to proceed to the release process.



Figure 10.4: PRC Staff: Blood Release Page
This figure shows the blood release queue page displaying requests with authorized releases awaiting blood unit handout. It includes a table with reference numbers, requester details, hospital, patient information, request type (STAT/Routine), and authorization date. The page serves as a second verification step before handing out blood units.


Figure 10.5: PRC Staff: Received Blood Page
This figure shows the received blood page for confirming blood units sent by volunteers. It includes a list of pending units with donor names and blood types. A detailed view displays barcode, blood type, component, volume, extraction and expiration dates, phlebotomist name, donor, origin branch, and buttons to close or confirm the received unit.


Figure 10.6.1: PRC Staff: Added/Released Blood Units Page
This figure shows the added and released blood units page for a specific branch (PRC Batangas City). It includes a date picker, filter buttons (Apply, Add, Release), and a section displaying units added on the selected date, showing no units added for April 14, 2026.



Figure 10.6.2: PRC Staff: 
This figure shows the expired blood units page displaying summary metrics (Total Expired: 7, Overdue: 2, Expired in Last 7 Days: 2). A table lists all expired units with barcode, blood type, component, expiration date, days past expiry, status (Expired or Overdue), and date added.


Figure 10.6.3.1: PRC Staff: Daily Blood Information Page
This figure shows the daily blood information report page displaying key metrics including collected today (0 units), available stock (12 units), dispensed today (0 units), and total payments recorded (₱0.00). It also includes a table showing available stock broken down by blood type and component, with options to refresh, print, or save as PDF.


Figure 10.6.3.2: PRC Staff: Daily Blood Information Report
This figure shows the daily blood information report for PRC Batangas City as of April 20, 2026. It displays summary metrics including units collected today, available stock, units dispensed today, and total amount collected. A table below breaks down available stock by blood type and component.

Figure 10.6.4.1: PRC Staff: Monthly Report Page
This figure shows the monthly report page displaying summary metrics for April 2026 including units added (5), available now (12), dispensed (1), requests (8), and total collected (₱4,500.00). It includes breakdown tables for units added by component, request status (Completed, Declined, Paid, Submitted), current inventory status (Available, Deducted, Expired, Reserved), and a list of dispensed blood units with details.


Figure 10.6.4.2: PRC Staff: Monthly Report
This figure shows the monthly blood report for PRC Batangas City for April 2026. It displays summary metrics including units added, currently available, units dispensed, total requests, and total amount collected. Additional tables break down units added by component, request status (Completed, Declined, Paid, Submitted), current inventory status (Available, Deducted, Disposed, Expired, Reserved), and a list of dispensed blood units for the month.

Figure 10.7: PRC Staff: Profile Page
This figure shows the staff profile page displaying user information including name, branch, status, last name, middle name, email address, and member since date. It includes a notification that the profile is incomplete, along with buttons to edit profile and change password.


Figure 11.1: Volunteer: Dashboard Page
This figure shows the volunteer dashboard displaying key metrics including donors registered today, successful extractions today, and blood bags collected today. It includes a notification that no branch is set for the account, with a dropdown to select a PRC branch, and a donor pipeline tracker showing steps from registration to extraction eligibility.


Figure 11.2.1: Volunteer: Register Donor Page
This figure shows the donor registration page displaying a form with fields for personal information (first name, last name, sex), contact information (number, email), permanent address (number, street, municipality), and biography. It includes a donor check result section and a "Check Donor" button to verify if the donor already exists before registering.

Figure 11.2.2: Volunteer: Eligibility Questionnaire Page
This figure shows the donor eligibility questionnaire page with 11 health screening questions (Yes/No format). It includes donor information fields (name, age, sex, blood type) and a live status indicator showing the eligibility result. A signature section is also displayed at the bottom.


Figure 11.3: Volunteer: Blood Type Testing Page
This figure shows the blood type testing page where volunteers can enter hemoglobin levels for screened donors. It includes donor search functionality, donor information display, hemoglobin guidelines (below 12.5 not allowed, 12.5–12.9 women only, 13.0 and above allowed), and real-time status updates for donation eligibility.


Figure 11.4: Volunteer: Blood Extraction Page
This figure shows the blood extraction page for recording details of donors who passed hemoglobin testing. It includes donor selection, extraction duration, blood bag barcode, phlebotomist name, component (Whole Blood), blood volume (450 mL), extraction date, and expiration date. A donor information panel displays donor ID, full name, sex, contact, address, blood type (A+), and hemoglobin level (13.00 g/dL).


Figure 11.5: Volunteer: Blood Unit Page
This figure shows the blood unit tracking page displaying collected blood bags with summary metrics. It includes search functionality and a list of donation records showing donor name, date, bag barcode, component, volume, phlebotomist, extraction date, expiration date, donor sex, and confirmation status when received by PRC staff.

Figure 11.6: Volunteer: Profile Page
This figure shows the volunteer profile page displaying user information including name, branch status (No Branch Assigned), active status, email address, contact number, and branch. It includes buttons to edit profile and change password.


Figure 12.1: Blood Requestor Sign In Page
This figure shows the requestor login page with fields for email address and password, a "Sign In" button, and a link to register for new users.

Figure 12.2: Blood Requestor Register Page
This figure shows the requestor registration page with fields for full name, email address, contact number, password (at least 8 characters), and confirm password.


Figure 12.3: Blood Requestor: Home Page
This figure shows the requestor home page displaying real-time blood supply across all PRC branches. It includes filter options by blood component with availability indicators. Blood stock is listed by blood type with corresponding branches and component types.

Figure 12.4: Blood Requestor: New Request Page
This figure shows the new request page with a multi-step process indicated by tabs: Terms & Details, Patient Info, Blood Units, Document, and Review. It includes a "Get Started" button to begin submitting an official blood unit request to the Philippine Red Cross.


Figure 12.5.1: Blood Requestor: Terms and Request Details
This figure shows the first step of the blood request process. It includes a Terms & Conditions section requiring acknowledgment, request type selection (Emergency or Standard), and dropdowns for selecting the requesting branch and hospital.

Figure 12.5.2: Blood Requestor: Patient Information New Request Page
This figure shows the patient information step of the blood request process. It includes fields for the patient's full name and age along with Back and Continue navigation buttons.


Figure 12.5.3: Blood Requestor: Blood Units Requested Page
This figure shows the blood units request step where the user specifies the needed blood type, component type, and quantity (maximum 20 units per request). It also displays the unit price, quantity, and estimated total amount, with a note that the final amount is confirmed after PRC staff validation.

Figure 12.5.4: Blood Requestor: Upload Request Document Page
This figure shows the document upload step of the blood request process. It includes a file upload area where users can click or drag and drop files (PDF, DOC, DOCX, JPG, PNG, max 5MB) and a Continue button to proceed.


Figure 12.5.5: Blood Requestor: Review Your Request Page
This figure shows the review step before submitting a blood request. It displays a summary of request details (type, branch, hospital), patient information (name, age), and blood units requested (blood type, component, quantity, unit price, estimated total). A note indicates that editing is not allowed after submission.


Figure 12.6: Blood Requestor: Your Requests Page
This figure shows the request history page displaying summary metrics. It includes filter options and search functionality. A message indicates no requests have been submitted yet, with a "Start a Request" button to create a new blood request.


Figure 12.7: Blood Requestor: Profile Page
This figure shows the requester profile page displaying user information including name, active status, last name, first name, contact number, email address, affiliated hospital, and member since date. A notification indicates the profile is incomplete, with buttons to edit profile and change password.


Figure 12.5.6: Blood Requestor: Payment Page
This figure shows the detailed view of a submitted blood request (Request #1009) with status "Submitted" and a message indicating it is waiting for PRC review. It includes request information (ID, branch, hospital, submission date), patient information, blood units requested (blood type: O+), and a timeline showing seven steps from "Request Submitted" to "Completed", with the first step marked as complete.

Security Architecture
The system is designed with multiple security layers to protect user data and prevent unauthorized access. Security is applied across authentication, authorization, data handling, and communication between the client and server. Authentication is implemented using session-based login. User passwords are securely hashed before storage and verified during login. Sessions are managed securely to ensure that only valid users can access the system. Authorization is enforced through Role-Based Access Control (RBAC), where users are assigned specific roles such as Admin, Staff, Volunteer, Requestor, and Donor. Access to system features is restricted based on these roles.

Input validation is applied to ensure that all user inputs are checked before processing. This prevents invalid or harmful data from being stored or used in the system. The system also protects against common web-based attacks such as SQL injection by using safe database queries, and against malicious script injection in web pages (cross-site scripting) by properly sanitizing output data. Secure communication is supported through HTTPS in deployment, ensuring that data transmitted between users and the system is encrypted.

Deployment Architecture

Figure 13: Deployment Diagram
The deployment diagram illustrates the physical arrangement of the BloodSync system and how its components interact within a client–server architecture. On the client side, a <<device>> labeled Client Device represents end-user devices such as desktops, laptops, tablets, and mobile phones. Inside it is a Web Browser, which serves as the interface for accessing the system. Through the browser, users send requests and receive responses, while the application interface is rendered using standard web technologies such as HTML, CSS, and JavaScript.

On the server side, the system is hosted on a <<device>> labeled Server, which contains the main components of the application. The Apache HTTP Server handles incoming requests from the client, serves static resources, and forwards dynamic requests to the application layer. The PHP Runtime executes the core logic of the BloodSync system, which consists of multiple PHP modules responsible for handling authentication, data processing, and other system operations. These modules work together to support the different functionalities of the application, including user management, blood inventory tracking, and transaction processing. The database layer is managed by a MySQL Server, which stores and organizes all system data such as user records, blood inventory information, donation transactions, and related operational data.

When a user interacts with the system, requests are sent from the web browser to the server through HTTPS. The Apache server receives and processes the request, then passes it to the PHP runtime for further execution. If data operations are required, the PHP layer communicates with the MySQL database to retrieve or update information. After processing, the response is returned through the same layers and displayed back to the user in the web browser. 

Hosting Environment
The BloodSync system uses a two-environment hosting setup that separates development from deployment. During development and testing, the system runs on a local server using XAMPP, which provides Apache HTTP Server, PHP runtime, and MySQL database on a local machine without requiring an active internet connection. For deployment, the system is hosted on Hostinger, a shared web hosting platform selected for its support of Apache, PHP, and MySQL within a single managed environment accessible over the internet. The server handles incoming requests through Apache, which forwards dynamic requests to the PHP runtime for processing, while all system records are stored and managed through a MySQL Server instance. Communication between the client and the server is secured through HTTPS, ensuring that all transmitted data is encrypted, with client devices accessing the system through a standard web browser with no additional software required.

Scalability and Performance Considerations
The system applies database indexing across its tables to support efficient data retrieval as records grow over time. All tables use auto-incremented primary keys, which MySQL indexes by default. Beyond that, foreign key columns are indexed across most tables to improve the performance of relational queries between records such as donations, donors, blood units, and branches. The donors table applies composite indexes on name and contact fields to optimize donor search operations, which are among the most frequently performed queries in the system. Unique indexes are also enforced on fields such as donor unique code, blood unit barcode, and user email to ensure data integrity while maintaining fast lookup performance.

In terms of load handling, the system is hosted on a starter shared hosting plan through Hostinger, meaning server resource management and concurrent user handling are managed at the infrastructure level by the hosting provider rather than configured within the system itself. This is considered sufficient for the pilot deployment, which targets a limited number of users across the selected PRC Batangas branches.

Advanced performance features such as caching mechanisms and dedicated load balancing are not implemented in the current version of the system, as these are beyond the scope of the proof-of-concept deployment. These are identified as areas for improvement should the system be considered for wider deployment in future development phases.
Design Constraints and Assumptions
The development of the BloodSync system is subject to several constraints that have directly influenced its design decisions and overall scope. As a capstone project developed by students within a single academic year, the system was built under a limited budget, which affected decisions on hosting plans, development tools, and the scale of deployment. This is reflected in the use of a starter shared hosting plan on Hostinger, which provides sufficient server resources for the pilot deployment but does not offer the dedicated hardware or advanced infrastructure features that a production-level system would typically require. The system is also fully web-based and therefore depends entirely on an active internet connection for all operations, with no support for offline functionality, meaning that any disruption in internet connectivity at a branch location would prevent users from accessing the system. Nationwide deployment would additionally require formal evaluation and approval from the Philippine Red Cross national office, which has not yet been obtained within the scope of this study. The system also does not include predictive analytics or machine learning capabilities, with analytical features limited to descriptive reporting based on existing stored data. A native mobile application was likewise not developed due to time and resource constraints, though the system is designed to be accessible across all operating systems and device types, including desktops, laptops, tablets, and mobile phones, through any standard web browser with an active internet connection.

The following assumptions were made during the design and development of the system. It is assumed that all authorized users, including PRC staff, volunteers, and blood requestors, have access to an internet-capable device and can access the system through a standard web browser. It is assumed that the hosting environment provided by Hostinger will remain stable and accessible throughout the duration of the study, and that the resources allocated under the current hosting plan are sufficient to support the pilot deployment. It is further assumed that the user roles and access permissions defined in the system, namely Admin, PRC Staff, Volunteer, and Requestor, accurately reflect the organizational structure and responsibilities of the participating PRC Batangas branches as gathered during the requirements analysis phase. It is also assumed that the donor eligibility rules and blood inventory thresholds applied in the system are consistent with the standard operating procedures of the Philippine Red Cross, and that all blood requests submitted through the Requestor portal originate from authorized hospitals or institutions, with the verification of uploaded hospital documents handled by PRC Staff as part of the blood request processing workflow.
				
Development Tools and Technologies	
This section presents the actual tools, technologies, and environment used in the development of the BloodSync: Blood Donation, Donor Monitoring, and Blood Bank Inventory Management System.

The system was primarily developed using Visual Studio Code as the code editor. It was selected because it is lightweight, easy to use, and supports multiple programming languages needed for the system such as PHP, HTML, CSS, and JavaScript. Its extensions also helped in improving code readability and organization during development. The development was conducted on a Windows-based environment with XAMPP used as the local server. XAMPP provided the necessary components such as Apache and MySQL, allowing the team to run and test the system locally before deployment. This setup made it easier to simulate how the system would function in an actual web server environment, especially for database-driven features.

Instead of using external API testing tools, system functionalities were tested directly within the browser and through actual system workflows. Since the project is highly dependent on database operations (such as adding donors, updating blood inventory, and processing requests), testing focused more on validating data flow, user role restrictions, and database transactions in real-time through actual system usage. For deployment, the system is hosted using Hostinger, a web hosting platform that supports PHP and MySQL. This ensures that the system can be accessed online and demonstrates how it would function in a real-world setting.

Programming Languages
The system was developed using the following programming languages:
PHP – Used as the core backend language to handle server-side logic, including database operations, user authentication, and processing of blood inventory data. PHP was chosen because it is well-suited for database-driven web applications and integrates seamlessly with MySQL. It was also used to implement session-based authentication, allowing the system to manage different user roles such as administrators and staff, and control access to specific system features.
HTML – Used to structure the system’s web pages, including forms for donor registration, blood requests, and inventory management.
CSS – Used to design and format the user interface, ensuring that the system is visually organized and easy to navigate.
JavaScript – Used to enhance interactivity, such as validating user inputs and improving the responsiveness of certain interface elements.
PHP was selected as the primary language not only for its compatibility with the chosen tools, but also because it is widely used in developing practical web systems that rely heavily on structured data and database relationships.

Frameworks and Libraries
The system was developed without the use of heavy frameworks. Instead, it utilizes native PHP, HTML, CSS, and JavaScript to maintain full control over the system’s logic and structure.

This approach was chosen to keep the system straightforward and aligned with the project’s requirements. Since the system focuses on core functionalities such as inventory tracking, donor monitoring, and request management, using native technologies allowed the developers to directly implement features without additional abstraction.

Basic styling techniques were applied using CSS to create a clean and functional user interface. The design prioritizes clarity and usability, especially for users in medical or administrative settings.

Database Technologies
The system uses MySQL as its relational database management system. MySQL was selected because it is reliable, widely used, and well-supported by both XAMPP and Hostinger. Database management was performed using phpMyAdmin, which allowed the team to easily create tables, define relationships, and execute queries during development.

The database plays a central role in the system, as it stores and manages critical data such as donor information, blood inventory levels, user accounts, and blood request records. Because the system is inventory-based, careful structuring of tables and relationships was necessary to ensure accurate tracking and data consistency. All database interactions were handled using PHP Data Objects (PDO). This approach improves security and flexibility by using prepared statements, helping prevent common vulnerabilities such as SQL injection while maintaining consistent database access across the system. It also supports the system’s role-based access by securely handling user credentials and session-linked queries.

Version Control and Collaboration Tools
The development process did not utilize formal version control systems such as Git. Instead, code management was handled manually by organizing files within the local development environment. Collaboration among developers was done through direct file sharing and coordination. While this approach is simpler, it requires careful handling to avoid overwriting changes and to maintain consistency across different parts of the system.
					
Testing and Validation	
The BloodSync system will be tested using a combination of unit testing, integration testing, system testing, and user acceptance testing (UAT) to ensure functionality, reliability, and usability across all four user roles. The testing process will follow a structured approach where individual modules are tested independently. Testing was done throughout the development lifecycle and upon system finalization to ensure all functional and non-functional requirements are met.

Types of Testing Conducted
A. Unit Testing
Unit testing will be performed on individual modules of the BloodSync system to ensure that each function operates correctly in isolation. 

The following modules will be tested: 
A.1 User Authentication Module
A.2 Donor Registration Module
A.3 Blood Inventory Management Module
A.4 Blood Request Processing Module
A.5 Blood Type Testing Module
A.6 Blood Extraction Module
A.7 Admin and Staff Dashboards

Each module will be tested to verify correct input handling, accurate output generation, and proper database interaction.

B. Integration Testing
Integration testing will be conducted to ensure proper communication between the frontend, backend, and database components of the system. 
The following scenarios will be tested: 
B.1 Donor registration form successfully storing donor data in the database
B.2 Hemoglobin level input correctly updating donor eligibility status in real time
B.3 Blood unit records added by PRC Staff reflecting accurately in the blood inventory
B.4 Blood requests submitted by the requestor appearing correctly in the PRC Staff request queue
B.5 Payment confirmation enabling the blood release authorization button on the staff side

C. System Testing
System testing will evaluate the complete and integrated BloodSync application to ensure compliance with all functional requirements. End-to-end scenarios will be executed, such as the following:

C.1 Volunteer registers donor → donor completes eligibility questionnaire → volunteer records hemoglobin level and blood type → volunteer records blood extraction → blood unit arrives at PRC branch and is confirmed by staff → blood unit appears in available inventory.
C.2 Blood Requestor submits blood request → PRC Staff reviews and approves request → requestor confirms payment → PRC Staff authorizes blood release → request status updated to completed.

C.3 Admin creates blood drive → assigns volunteers and phlebotomists → volunteer conducts blood drive → extracted units are tracked and confirmed at branch.

Test Case Design
Test Case ID
Module
Test Case Scenario
Input
Expected Output
Result
TC-01
Authentication
Valid login - PRC Staff
Correct email and password
Redirect to PRC Staff dashboard
TBD
TC-02
Authentication
Valid login - Volunteer
Correct email and password
Redirect to PRC Staff dashboard
TBD
TC-03
Authentication
Invalid login
Wrong password
Error message displayed
TBD
TC-04
Authentication
Unauthorized role access
Staff attempts to access Volunteer page
Redirected to login page
TBD
TC-05
Donor Registration
Register new donor
Complete valid donor information
Donor saved with auto-generated donor ID
TBD
TC-06
Donor Registration
Check existing donor
Name and birthdate matching an existing record
System displays existing donor details
TBD
TC-07
Donor Registration
Duplicate donor handling
Same name and birthdate entered twice
System flags existing record and prompts volunteer
TBD
TC-08
Eligibility Questionnaire
Eligible donor
All disqualifying questions answered No
System displays eligible status; donor proceeds
TBD
TC-09
Eligibility Questionnaire
Deferred donor
At least one disqualifying question answered Yes
System displays deferred status; donor cannot proceed
TBD
TC-10
Blood Type Testing
Allowed hemoglobin - male
13.5 g/dL entered for male donor
System displays allowed status in green
TBD
TC-11
Blood Type Testing
Not allowed hemoglobin
11.0 g/dL entered for any donor
System displays not allowed status
TBD
TC-12
Blood Type Testing
Borderline hemoglobin - female
12.7 g/dL entered for female donor
System displays allowed status for women only
TBD
TC-13
Blood Extraction
Normal extraction
Extraction time under 15 minutes, all fields completed
Blood unit saved with correct component and status
TBD
TC-14
Blood Extraction
QNS classification
Extraction time of 15 minutes or more entered
System classifies unit as QNS; remaining fields disabled
TBD
TC-15
Blood Inventory
Add blood unit
Valid barcode, blood type, component, and collection date entered
Unit added to inventory with auto-calculated expiration date
TBD
TC-16
Blood Inventory
Dispose expired unit
Staff clicks dispose on an expired unit and types "dispose"
Unit status updated to disposed and removed from active inventory
TBD
TC-17
Blood Request
Submit blood request
Requestor completes all steps and submits
Request appears in PRC Staff active queue
TBD
TC-18
Blood Request
STAT request prioritization
Request submitted with Emergency type
Request highlighted and pinned to top of active queue
TBD
TC-19
Blood Release
Authorize release
Staff clicks release after payment confirmation is received
Request status updated to released; units deducted from inventory
TBD
TC-20
Reports
Generate daily blood information report
Staff opens daily report for current date
Report displays correct unit counts, dispensed units, and payment totals
TBD

Table 5: Test Case Design
								
Deployment and Implementation
System Deployment
During development, the system was run locally using the XAMPP environment, which provided Apache server, PHP runtime, and MySQL database on a local machine for initial testing and debugging. After all modules were tested and confirmed to be working correctly, the system was deployed online using Hostinger web hosting, allowing authorized users such as PRC staff, volunteers, and requestors to access the system through the internet from any location.

Deployment Environment
The system uses the following environment:
Frontend: HTML, CSS, JavaScript
Backend: PHP
Database: MySQL (phpMyAdmin)
Development: XAMPP (localhost)
Production: Hostinger hosting

This setup enables centralized data storage and real-time access to system data across the four selected PRC branches in Batangas Province, namely Lipa City, Tanauan City, Batangas City, and Nasugbu. By hosting the system online, all branches can coordinate and share donor records, blood inventory information, and blood requests through a single unified platform.

Installation and Configuration
For local setup, XAMPP was installed on the development machine, and all system files were placed in the htdocs folder. The database was then imported through phpMyAdmin, which created all necessary tables including users, donors, blood units, blood requests, and branches. For online deployment, all system files were uploaded to Hostinger via FTP, a new database was created on the hosting server, and the database connection settings in the configuration files were updated to point to the production database. User accounts and roles for Admin, PRC Staff, Volunteer, and Requestor were also set up for system access, ensuring that each user type has the appropriate permissions based on their responsibilities.

Implementation Strategy
A phased implementation approach was used to ensure a smooth transition from development to production. First, development and testing were conducted using XAMPP, where each module including donor registration, inventory management, blood request processing, and reporting was tested independently and as an integrated system. Second, a pilot deployment was performed on Hostinger with a limited group of users from the four selected branches to identify any issues that might arise in the live environment. Finally, full implementation was rolled out for system use, making all features available to all authorized users. This phased approach ensured that the system was thoroughly tested and stable before being made available for actual operational use.

User Training
Users will be given orientation and hands-on training on how to use the system effectively. Tasks such as donor registration, eligibility screening, blood extraction recording, inventory updating, blood request processing, and report generation will be demonstrated step by step. Training will focus on PRC staff, volunteers, and requestors to ensure proper system usage. Written documentation with screenshots and step-by-step guides will also be provided to each participating branch for future reference. The training will be conducted before the system is fully deployed to ensure that all users are comfortable and confident in using the system.

Maintenance and Support
The system will be maintained through regular system monitoring to identify any performance issues or errors. Manual database backups will be performed using phpMyAdmin to prevent data loss, with backup copies stored securely for recovery purposes. Bug fixing and updates will be implemented as needed based on user feedback and issues discovered during daily operations. Basic technical support will be provided to users who encounter difficulties while using the system. Security checks for user access and data protection will also be performed regularly to ensure that only authorized individuals can access sensitive donor and blood inventory information.

Operational Readiness
The system is fully functional as a working prototype and can be used to manage donor records, blood inventory, and blood requests across the four selected PRC branches in Batangas Province. It demonstrates improved efficiency and accuracy compared to current manual processes by providing automated expiration date calculation, real-time inventory visibility, unified donor identification, and digital blood request processing with proper documentation. The system is ready for demonstration and evaluation by the intended users.
