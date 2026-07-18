1. Who uses the system?
There are 5 kinds of people (accounts) in BloodSync:
Who
What they mainly do
Admin
Runs the whole system. manages staff accounts, branches, and overall reports. Does not personally collect blood.
PRC Staff
Works at a specific branch. Runs blood drives, handles walk-in donors, tests blood, manages inventory, and approves blood requests.
Volunteer
Helps out during blood drives. registering donors, doing interviews, etc.
Phlebotomist
The trained person who actually draws (extracts) blood from a donor during a drive.
Requestor
A hospital or someone requesting blood for a patient. Can use the mobile app or the website.


2. Signing Up
Volunteers and Phlebotomists
They create an account with an email and password.
Their account is not usable right away. It stays "pending" until an admin checks their requirements and approves it.
If declined, they can try again using the same email.
One email can only be used for one account.
Requestors (hospitals/patients)
Can sign up on their own, no approval needed, they can request blood right away.
Staff and Admin accounts
These are not self-signup. An Admin creates these accounts directly.
The system automatically creates a temporary password and emails it to the new staff member, along with a suggestion to change it.

3. Organizing a Blood Drive
A "blood drive" is an event where people come to donate blood; for example, at a school, a company, or a community event.
Both Admins and Staff can create a blood drive.
The organizer picks a date, time, and place. The system won't allow picking a date in the past.
Instead of typing an address, the person creating the drive can just pin the location on a map, the system fills in most of the address details automatically.
Volunteers and Phlebotomists can be invited to help at the drive. They get an email and can accept or decline.
The organizer can either handpick who joins the drive, or let the system automatically choose the closest available volunteers based on their address, the system can even show how far each volunteer lives from the drive.
A blood drive can be made "public" (anyone can apply to join) or "private" (only the people the staff picked can join).
Once a blood drive is happening, staff can watch it live, how many people donated, how many are new donors, how many didn't qualify, etc.
A blood drive that has ended or been cancelled can no longer be edited.

4. The Blood Donation Process
This is the actual step-by-step journey a donor goes through, either at a blood drive or by walking directly into a branch.
Step 1: Registration
The donor's basic information is collected: name, birthdate, contact info, etc.
Donors must be 18 years old or older.
If the system suspects this donor has already registered before (same ID number, or same name + birthdate), it will politely warn the staff before creating a duplicate account.
Step 2: Interview
The donor answers a list of health and lifestyle questions.
Depending on how they answer, they might be told they can't donate right now (this is called being "deferred"). This protects both the donor and the person who will eventually receive the blood.
Step 3: Screening
A quick health check happens here, checking things like the donor's hemoglobin level (a measure of how much iron is in the blood) and confirming their blood type.
The donor must pass this check to move forward.
Step 4: Blood Extraction (Donation)
This is where the actual blood is drawn, done by a phlebotomist.
The system records who did the extraction and how long it took.
If the process/extraction duration(>15mins) didn't go as expected (for example, took too long), the donation is marked accordingly so staff know it may not be usable.
Every step keeps track of who passed and who didn't, and why, so nothing gets lost or forgotten.

5. Blood Testing
Before any donated blood can be used, it must be tested and confirmed safe (the actual lab testing happens outside the system, BloodSync just tracks the result).
Blood sits in a "pending" list until staff mark it as tested.
Staff can mark it either Safe (ready to be added to the usable inventory) or Rejected (not safe to use).

6. Splitting Blood Into Its Parts (Separation)
Whole blood can be separated into three usable parts:
Red blood cells
Plasma
Platelets
Only blood that has already passed testing can be separated this way. Each of the three new parts must go through its own safety testing again before it can be added to inventory, separating blood doesn't skip the safety check, it just repeats it for each new part.
Each part also gets its own "expiration clock", it doesn't inherit the original whole blood's expiration date, since each component lasts a different amount of time.

7. Blood Inventory (Storage)
This is where all tested, ready-to-use blood is tracked.
Staff can see all blood units available at their branch. Admins can see every branch.
Units that are close to or already past their expiration date are clearly highlighted (red = expired, orange = expiring soon).
Staff can remove expired units from the shelf, the system requires them to type the word "remove" first, so units aren't accidentally deleted.

8. Requesting Blood (for Hospitals / Patients)
A hospital or requestor who needs blood goes through this process:
They choose the blood type, the specific component needed (e.g. whole blood, platelets), and how many units.
The system checks which nearby branch has what they need. If the closest branch doesn't have enough, it looks at the next closest one, and can even combine units from two branches if needed to fulfill the full request.
The requestor uploads a request form (a document proving the request is legitimate) and picks which hospital it's from.
Staff review the request and either approve or decline it, based on whether it looks legitimate.
Once approved, the system automatically picks which specific blood units to release, always preferring the ones closest to expiring first, so nothing goes to waste (but never one that's about to expire within a day).
When the requestor picks up the blood, they confirm receipt in the system. If they forget, staff can still manually mark it as released (again, protected by typing a confirmation word first).
The requestor gets email updates as their request moves through this process, and the system tells them roughly how long they should expect to wait.

9. Notifications
Everyone in the system, Admin, Staff, Volunteers, Phlebotomists, and Requestors, gets notified about things relevant to them: new blood requests, drive assignments, request approvals, and more. A small badge shows how many notifications haven't been read yet.

10. Managing Users (Admin Only)
Admins have a dedicated area where they can:
See every user in the system and whether they're currently online.
Create new Staff or Admin accounts.
Review and approve/decline pending Volunteer and Phlebotomist applications.

In short
BloodSync connects every step of the blood donation journey, from the moment someone signs up to volunteer, to the moment a patient actually receives blood, into one system, so nothing gets lost, nothing expires without anyone noticing, and everyone involved knows exactly what's happening and when.

Where the system lives (Hosting)
Service
What it does for BloodSync
Railway
This is where the actual website/system runs and is made available on the internet. Think of it as the "building" the system lives in.


Where the data is stored
Service
What it does for BloodSync
Neon
This is the database, the place where all the actual information lives: donor records, blood units, requests, accounts, etc. It's a PostgreSQL database, which is a well-known, reliable type of database.


Where uploaded files go
Service
What it does for BloodSync
Cloudinary
Whenever someone uploads a file, like an ID document, a request form, or a profile photo, it's stored here instead of on BloodSync's own server. This keeps the system lighter and the files more secure.


Speed and traffic protection
Service
What it does for BloodSync
Upstash (Redis)
Helps the system respond faster by temporarily remembering frequently-requested information, and also helps block people from overloading the system with too many requests too quickly (like repeated login attempts).


Watching for problems
Service
What it does for BloodSync
GlitchTip
Automatically catches and reports errors that happen while the system is running, so issues can be found and fixed quickly, often before anyone even reports them.


Sending emails
BloodSync sends automatic emails for things like account approval, password creation, blood drive invitations, and request status updates. (The exact email-sending service isn't detailed in the current documentation, if you'd like this filled in accurately, let me know which provider is used, e.g. Gmail SMTP, SendGrid, Resend, etc.)

Real-time updates
Tool
What it does for BloodSync
Socket.IO
This is what makes things update instantly on screen without refreshing the page, for example, when a new blood request comes in, staff see it appear right away instead of having to reload.


Maps and location features (Borrowed Features)
BloodSync uses map-based tools so people don't have to manually type addresses:
A map picker lets someone creating a blood drive (or a volunteer setting their address) simply drop a pin on a map instead of typing an address by hand, the system fills in most of the details automatically.
The system can calculate distance in kilometers between a volunteer/requestor and a branch or drive location, so it can suggest the nearest option automatically.


### security
1. Logging In Safely
Passwords are never stored as plain, readable text. Before being saved, they go through a scrambling process called hashing (specifically using something called bcrypt), so even if someone got access to the database, they still couldn't see anyone's actual password.
When you log in, the system gives you a temporary "pass" called a JWT (JSON Web Token) that proves you're logged in. This pass automatically expires after 15 minutes and quietly renews itself in the background while you're active, using something called a refresh token, you don't need to keep logging back in.
This login pass is stored using something called httpOnly cookies. In simple terms, this means the pass is kept somewhere that the webpage's own JavaScript code cannot read or touch, so even if a malicious script somehow got onto the page, it still couldn't steal your login pass.
The cookies also use two extra safety settings: secure (only sent over encrypted HTTPS connections, never plain unprotected ones) and sameSite: strict (the cookie won't be sent if you're tricked into visiting a fake or unrelated website, this specifically blocks a trick called CSRF).
Refresh tokens aren't stored as plain text either, they're stored hashed (SHA-256) in the database, and every time you refresh your session, the old one is destroyed and a new one is issued (called token rotation), so a stolen refresh token can only ever be used once before it stops working.
When you log out, your session is deleted from the database immediately, not just "expired later," but truly and permanently killed right away.
If your account gets deactivated by an admin, the system re-checks your account status every time your session refreshes, so you can't quietly stay logged in after being deactivated.

2. Making Sure People Only See What They're Allowed To
Every account has a role (Admin, Staff, Volunteer, Phlebotomist, or Requestor). This system of checking roles is called Role-Based Access Control (RBAC), and it's checked on every single action, not just when you log in.
PRC Staff can only manage their own branch's blood drives, inventory, and requests, this is called branch ownership enforcement. They cannot reach into another branch's data, even if they tried to guess a link or ID.
Volunteers and Phlebotomists can only do donation-related work if they're actually assigned to an active blood drive happening right now, this check is sometimes called the field operation gate. They also can't act on a different blood drive than the one they're assigned to, a protection called cross-drive isolation.
Certain personal details (like a Volunteer's legal name or birthdate) are locked once submitted, called identity field locking. Even a technically savvy person can't change them by manipulating a form, because the system itself refuses the change no matter how the request is sent.

3. Protecting Against Malicious Input
Every piece of text submitted anywhere in the system (search boxes, forms, etc.) is automatically cleaned to remove anything that looks like it's trying to inject malicious code, this protection is called XSS protection (XSS stands for Cross-Site Scripting, a common way attackers try to sneak harmful code into a webpage).
Uploaded files (like ID documents or request forms) go through file upload validation, only images and PDF files are accepted, and there's a 5MB size limit. Files are never saved directly onto the server; they're sent straight to a secure file storage service (Cloudinary) instead.
The system uses HPP protection (HTTP Parameter Pollution) to stop a trick where someone sends duplicate or conflicting form data to confuse the system.
A tool called Helmet automatically adds a set of standard, widely-recommended safety headers to every response, protecting against things like clickjacking (being tricked into clicking something hidden) and browser content-type trickery.

4. Stopping Abuse and Overload
This protection is called rate limiting. If someone tries to log in too many times too quickly (a sign of a password-guessing attack), the system automatically blocks further attempts for a while.
The same protection applies to regular use of the system, if there's unusually heavy or rapid activity, the system automatically slows it down, protecting the service for everyone else. This is powered by a service called Upstash (Redis), which keeps track of this evenly even if the system is running on multiple servers at once.

5. Protecting Blood Records From Mistakes and Conflicts
If two staff members try to approve the same blood request at the exact same time, the system uses something called a row-level lock (SELECT FOR UPDATE) to make sure only one of them succeeds, it won't accidentally give away the same blood units twice.
When blood is being picked to fulfill a request, the system always chooses the units that are closest to expiring first (as long as they won't expire within a day), this method is called FEFO (First Expired, First Out). It's automatic and can't be skipped.
All dates and times are handled using timezone-aware storage (TIMESTAMPTZ), with explicit Philippine time conversion, this makes sure "9:00 AM" always means 9:00 AM Philippine time, no matter where the server physically runs, preventing scheduling mix-ups.

6. Watching for Problems
A tool called GlitchTip (works similarly to a well-known service called Sentry) automatically tracks errors as they happen, so technical issues can be caught and fixed quickly, often before a user even reports them.
Error messages shown to users are always simple and safe ("something went wrong, please try again"), raw technical error details are never exposed on-screen, since they could accidentally reveal sensitive system information.

7. Safe Email Confirmation Links
When a Volunteer or Phlebotomist is invited to a blood drive, the confirm/decline link sent to their email contains a long, randomly generated code (a cryptographically random token) that's extremely difficult to guess.
That code is single-use, after it's clicked, it's immediately destroyed, so the same email link can't be reused or shared to fake a response later.

8. Careful Design Choices Behind the Scenes
A few decisions were made specifically to reduce the chances of security problems happening in the first place:
Requestor accounts and staff accounts don't use two separate, inconsistent login systems (a unified users table design), everything goes through one consistent, well-tested login process, reducing the chance of a weak spot being overlooked.
Every change to a blood request's status (approved, released, rejected, etc.) is permanently logged in an audit trail, creating a paper trail that shows exactly what happened, when, and by whom.
A donor's email address is always required before blood can be drawn from them, enforced by the system itself, not left to staff to remember.
The step-by-step donation process (Interview → Screening → Donation) cannot be skipped or reordered, this is called sequential medical flow enforcement. The system checks that each earlier step was actually completed before allowing the next one.
The team also specifically evaluated and decided against using a database-level feature called Row-Level Security (RLS), because it wasn't compatible with the way the database connections are managed. Instead, the same protection is enforced directly in the system's own code, just through a different, equally deliberate method.

9. Where Everything Is Hosted
All sensitive settings (like database passwords or secret keys) are kept in a protected configuration area called environment variables, never written directly into the code.
The website only works over HTTPS, an encrypted connection, the same kind of protection used by online banking — so data can't be intercepted while traveling between your browser and the server.
File storage (Cloudinary), the database (Neon), and the caching/rate-limiting service (Upstash) all enforce encrypted, secure connections (TLS/SSL) as well.

10. Honesty About Limitations
No system is perfect, and BloodSync's team keeps an honest, written list of small known limitations, things that are minor, don't create security risk, but are worth knowing about (for example, some pages don't yet support showing results in smaller batches, called pagination, when there's a very large amount of data). None of these affect the safety of your personal information or blood records.

In short
BloodSync was built with the assumption that mistakes and bad actors will happen, so instead of relying on people to always do the right thing, the system itself enforces the rules automatically, at every step, for every type of user, using well-established, industry-standard tools and techniques rather than custom, unproven ones.

