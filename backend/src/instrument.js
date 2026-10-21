// Loaded before anything else so Sentry can hook into express/http. No-op without SENTRY_DSN.
require('dotenv').config();
const Sentry = require('@sentry/node');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false
  });
}

module.exports = Sentry;
