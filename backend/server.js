const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(hpp());
app.use((req, res, next) => {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = xss(req.body[key]);
            }
        }
    }
    next();
});

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        status: 'error',
        message: 'Too many requests, please try again later'
    }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        status: 'error',
        message: 'Too many login attempts, try again in 15 minutes'
    }
});

// General middleware
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', limiter);
app.use('/api/auth/login', loginLimiter);

// Routes
const roleRoutes     = require('./app/routes/roleRoutes');
const branchRoutes   = require('./app/routes/branchRoutes');
const hospitalRoutes = require('./app/routes/hospitalRoutes');
const userRoutes     = require('./app/routes/userRoutes');
const authRoutes     = require('./app/routes/authRoutes');
const donorRoutes    = require('./app/routes/donorRoutes');
const interviewQuestionRoutes = require('./app/routes/interviewQuestionRoutes');
const screeningRoutes =         require('./app/routes/screeningRoutes');
const interviewAnswerRoutes =   require('./app/routes/interviewAnswerRoutes');
const deferralRoutes =          require('./app/routes/deferralRoutes');

app.use('/api/roles',               roleRoutes);
app.use('/api/branches',            branchRoutes);
app.use('/api/hospitals',           hospitalRoutes);
app.use('/api/users',               userRoutes);
app.use('/api/auth',                authRoutes);
app.use('/api/donors',              donorRoutes);
app.use('/api/interview-questions', interviewQuestionRoutes);
app.use('/api/screenings',          screeningRoutes);
app.use('/api/interview-answers',   interviewAnswerRoutes);
app.use('/api/deferrals',           deferralRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'BloodSync API is running' });
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});