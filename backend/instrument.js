require('dotenv').config();

const Sentry = require('@sentry/node');
const { nodeProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: process.env.GLITCHTIP_DSN,
  environment: process.env.NODE_ENV || 'development',
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 0.2,       // 20% of transactions — good for thesis/dev
  autoSessionTracking: false,  // GlitchTip does not support sessions
});