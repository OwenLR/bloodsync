require("./instrument");

const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const helmet = require("helmet");
const hpp = require("hpp");
const xss = require("xss");
const Sentry = require("@sentry/node");

dotenv.config();

const app = express();

app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
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
app.use(morgan('dev'));

// Rate limiting via Upstash
const { apiRateLimiter, loginRateLimiter } = require('./middleware/upstashRateLimiter');
app.use('/api', apiRateLimiter);
app.use('/api/auth/login', loginRateLimiter);
app.use('/api/requestors/login', loginRateLimiter);

// Routes
const roleRoutes = require("./app/routes/roleRoutes");
const branchRoutes = require("./app/routes/branchRoutes");
const hospitalRoutes = require("./app/routes/hospitalRoutes");
const userRoutes = require("./app/routes/userRoutes");
const authRoutes = require("./app/routes/authRoutes");
const donorRoutes = require("./app/routes/donorRoutes");
const interviewQuestionRoutes = require("./app/routes/interviewQuestionRoutes");
const screeningRoutes = require("./app/routes/screeningRoutes");
const interviewAnswerRoutes = require("./app/routes/interviewAnswerRoutes");
const deferralRoutes = require("./app/routes/deferralRoutes");
const donationRoutes = require("./app/routes/donationRoutes");
const bloodCollectionRoutes = require("./app/routes/bloodCollectionRoutes");
const bloodUnitRoutes = require("./app/routes/bloodUnitRoutes");
const bloodRequestRoutes = require('./app/routes/bloodRequestRoutes');
const registrationRoutes = require('./app/routes/registrationRoutes');
const donorInterviewRoutes = require('./app/routes/donorInterviewRoutes');
const bloodDriveRoutes = require('./app/routes/bloodDriveRoutes');
const volunteerProfileRoutes  = require('./app/routes/volunteerProfileRoutes');

app.use("/api/roles", roleRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/interview-questions", interviewQuestionRoutes);
app.use("/api/screenings", screeningRoutes);
app.use("/api/interview-answers", interviewAnswerRoutes);
app.use("/api/deferrals", deferralRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/blood-collections", bloodCollectionRoutes);
app.use("/api/blood-units", bloodUnitRoutes);
app.use('/api/blood-requests', bloodRequestRoutes);
app.use('/api', registrationRoutes);
app.use('/api/donor-interviews', donorInterviewRoutes);
app.use('/api/blood-drives', bloodDriveRoutes);
app.use('/api/volunteers/me', volunteerProfileRoutes); 

app.get("/", (req, res) => {
    res.json({ message: "BloodSync API is running" });
});

// GlitchTip error handler — after all routes
Sentry.setupExpressErrorHandler(app);

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err.message);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});