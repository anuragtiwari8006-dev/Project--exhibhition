// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const MaintenanceIssue = require('../models/MaintenanceIssue');
const Visitor = require('../models/Visitor');
const Announcement = require('../models/Announcement');
const FacultyProfile = require('../models/FacultyProfile');
const { detectUrgency } = require('../utils/urgencyDetector');

// Middlewares
const { authenticateUser, requireRole } = require('../middleware/auth');
const { ticketSubmissionLimiter, visitorPassLimiter } = require('../middleware/rateLimiter');
const { sanitizeFormInputs } = require('../middleware/validateInput');
const { enforceMaxPendingIssues } = require('../middleware/checkActiveTickets');

// Protect all routes below for residents only
router.use(authenticateUser, requireRole('resident'));

// Resident Dashboard Route
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    const issues = await MaintenanceIssue.find({ resident: userId }).sort({ createdAt: -1 });
    const rawVisitors = await Visitor.find({ resident: userId }).sort({ createdAt: -1 });

    const now = new Date();

    // Process passes: check expiry against applied visit date & generate QR for approved passes
    const visitors = await Promise.all(
      rawVisitors.map(async (v) => {
        const pass = v.toObject();

        // Expire if today is past the applied visit date and pass is still unchecked
        if (pass.visitDate) {
          const visitDayEnd = new Date(pass.visitDate);
          visitDayEnd.setHours(23, 59, 59, 999);

          if (now > visitDayEnd && pass.status !== 'CheckedIn' && pass.status !== 'EXPIRED') {
            await Visitor.findByIdAndUpdate(pass._id, { status: 'EXPIRED' });
            pass.status = 'EXPIRED';
          }
        }

        // Generate QR code data URL for Approved passes (case-insensitive check)
        const statusUpper = String(pass.status || '').toUpperCase();
        if (statusUpper === 'APPROVED') {
          try {
            pass.qrCode = await QRCode.toDataURL(String(pass.passcode), {
              width: 140,
              margin: 1,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
          } catch (qrErr) {
            console.error('QR Generation failed for passcode:', pass.passcode, qrErr);
            pass.qrCode = null;
          }
        } else {
          pass.qrCode = null;
        }

        return pass;
      })
    );

    const announcements = await Announcement.find()
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });

    res.render('student-dashboard', { 
      user: req.user, 
      issues: issues || [], 
      visitors: visitors || [], 
      announcements: announcements || [] 
    });
  } catch (err) {
    next(err);
  }
});

// Maintenance Issue Submission Route (With Rate Limiter, Cooldown & Auto-Urgency)
router.post(
  '/issues',
  ticketSubmissionLimiter,
  sanitizeFormInputs,
  enforceMaxPendingIssues,
  async (req, res, next) => {
    try {
      const userId = req.user.id || req.user._id;
      const { category, description } = req.body;

      // Automatically compute urgency priority
      const calculatedUrgency = detectUrgency(description);

      await MaintenanceIssue.create({
        resident: userId,
        roomNumber: req.user.roomNumber || 'N/A',
        category: category,
        urgency: calculatedUrgency,
        description: description
      });

      res.redirect('/student/dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// Visitor Pass Request Route (Saves Explicit Visit Date)
router.post(
  '/visitors',
  visitorPassLimiter,
  sanitizeFormInputs,
  async (req, res, next) => {
    try {
      const userId = req.user.id || req.user._id;
      const passcode = Math.floor(100000 + Math.random() * 900000).toString();

      await Visitor.create({
        resident: userId,
        visitorName: req.body.visitorName,
        visitorPhone: req.body.visitorPhone,
        visitDate: new Date(req.body.visitDate),
        passcode: passcode,
        status: 'PENDING'
      });

      res.redirect('/student/dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// Faculty Directory View
router.get('/faculty-directory', async (req, res, next) => {
  try {
    const facultyProfiles = await FacultyProfile.find().populate('user', 'name email');
    
    res.render('student-faculty-view', { 
      user: req.user, 
      facultyList: facultyProfiles || [] 
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;