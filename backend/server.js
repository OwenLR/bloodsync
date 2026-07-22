require("./instrument");

const express      = require("express");
const http         = require("http");
const path         = require("path");
const dotenv       = require("dotenv");
const morgan       = require("morgan");
const helmet       = require("helmet");
const hpp          = require("hpp");
const cors         = require("cors");
const xss          = require("xss");
const Sentry       = require("@sentry/node");
const cookieParser = require("cookie-parser");

dotenv.config();

const app    = express();
const server = http.createServer(app);

app.set("trust proxy", 1);

// CORS — must be before all other middleware
// WEB_ORIGIN: your web app URL (e.g. https://bloodsync.hostinger.com)
// Mobile (React Native) sends requests directly — no browser CORS restriction,
// but credentials: true + explicit origin list is still required for web cookies.
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5500", "http://127.0.0.1:5500"]; // Live Server defaults for local dev

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, server-to-server)
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true, // Required for httpOnly cookies to be sent/received
    })
);

// Security middleware
// CSP configured to allow same-origin scripts (frontend JS modules),
// the Socket.io CDN, Leaflet from unpkg.com, and WebSocket connections.
// connectSrc includes Nominatim for reverse geocoding (Section B map picker)
// and forward geocoding on the field registration form (Volunteer/
// Phlebotomist address -> lat/lng, silent on barangay select).
// connectSrc also includes psgc.gitlab.io — PSGC (Philippine Standard
// Geographic Code) API, used to populate the province/city/barangay
// cascading dropdowns on the same registration form. Added this session,
// added to CSP so those fetch() calls aren't silently blocked in-browser.
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:  ["'self'"],
            scriptSrc:   ["'self'", "https://cdn.socket.io", "https://unpkg.com"],
            styleSrc:    ["'self'", "'unsafe-inline'", "https://unpkg.com"],
            connectSrc:  ["'self'", "ws://localhost:3000", "wss://localhost:3000", "https://cdn.socket.io", "https://nominatim.openstreetmap.org", "https://psgc.gitlab.io", "https://unpkg.com"],
            imgSrc:      ["'self'", "data:", "https://res.cloudinary.com", "https://*.tile.openstreetmap.org", "https://unpkg.com"],
            fontSrc:     ["'self'"],
            objectSrc:   ["'none'"],
        },
    },
}));
app.use(hpp());
app.use((req, res, next) => {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === "string") {
                req.body[key] = xss(req.body[key]);
            }
        }
    }
    next();
});

// General middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Rate limiting via Upstash
const { apiRateLimiter, loginRateLimiter } = require("./middleware/upstashRateLimiter");
app.use("/api", apiRateLimiter);
app.use("/api/auth/login", loginRateLimiter);
app.use("/api/requestors/login", loginRateLimiter);

// Routes
const roleRoutes             = require("./app/routes/roleRoutes");
const branchRoutes           = require("./app/routes/branchRoutes");
const hospitalRoutes         = require("./app/routes/hospitalRoutes");
const userRoutes             = require("./app/routes/userRoutes");
const authRoutes             = require("./app/routes/authRoutes");
const donorRoutes            = require("./app/routes/donorRoutes");
const interviewQuestionRoutes = require("./app/routes/interviewQuestionRoutes");
const screeningRoutes        = require("./app/routes/screeningRoutes");
const interviewAnswerRoutes  = require("./app/routes/interviewAnswerRoutes");
const deferralRoutes         = require("./app/routes/deferralRoutes");
const donationRoutes         = require("./app/routes/donationRoutes");
const bloodCollectionRoutes  = require("./app/routes/bloodCollectionRoutes");
const bloodUnitRoutes        = require("./app/routes/bloodUnitRoutes");
const bloodRequestRoutes     = require("./app/routes/bloodRequestRoutes");
const registrationRoutes     = require("./app/routes/registrationRoutes");
const donorInterviewRoutes   = require("./app/routes/donorInterviewRoutes");
const bloodDriveRoutes       = require("./app/routes/bloodDriveRoutes");
const volunteerProfileRoutes = require("./app/routes/volunteerProfileRoutes");
const notificationRoutes     = require("./app/routes/notificationRoutes");
const referenceRoutes        = require("./app/routes/referenceRoutes");
const reportRoutes           = require("./app/routes/reportRoutes");

app.use("/api/roles",             roleRoutes);
app.use("/api/branches",          branchRoutes);
app.use("/api/hospitals",         hospitalRoutes);
app.use("/api/users",             userRoutes);
app.use("/api/auth",              authRoutes);
app.use("/api/donors",            donorRoutes);
app.use("/api/interview-questions", interviewQuestionRoutes);
app.use("/api/screenings",        screeningRoutes);
app.use("/api/interview-answers", interviewAnswerRoutes);
app.use("/api/deferrals",         deferralRoutes);
app.use("/api/donations",         donationRoutes);
app.use("/api/blood-collections", bloodCollectionRoutes);
app.use("/api/blood-units",       bloodUnitRoutes);
app.use("/api/blood-requests",    bloodRequestRoutes);
app.use("/api/reports",           reportRoutes);
app.use("/api",                   registrationRoutes);
app.use("/api/donor-interviews",  donorInterviewRoutes);
app.use("/api/blood-drives",      bloodDriveRoutes);
app.use("/api/volunteers/me",     volunteerProfileRoutes);
app.use("/api/notifications",     notificationRoutes);
app.use("/api/reference",         referenceRoutes);

// Serve frontend static files
// In production (Railway): serves the frontend/ folder from the same deployment.
// In local dev: visit http://localhost:3000 to use the backend-served frontend.
app.use(express.static(path.join(__dirname, "../frontend")));

// Fallback for frontend routes — app.use() avoids Express 5 path-to-regexp wildcard issues.
// Skips /api routes so API endpoints are unaffected.
app.use((req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// GlitchTip error handler — after all routes
Sentry.setupExpressErrorHandler(app);

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err.message);
});

// Socket.io + Scheduler
const { initSocket }      = require("./app/socket/socketHandler");
const { startScheduler }  = require("./app/scheduler/inventoryScheduler");

initSocket(server);
startScheduler();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
});