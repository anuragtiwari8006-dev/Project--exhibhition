const rateLimit = require('express-rate-limit');

// Limit maintenance ticket submission (e.g., max 5 requests per hour)
const ticketSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5,
  message: 'Too many maintenance requests submitted from this account. Please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit visitor passcode generation (e.g., max 10 per day)
const visitorPassLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours window
  max: 10,
  message: 'Daily visitor pass limit reached.',
});

module.exports = { ticketSubmissionLimiter, visitorPassLimiter };