const express = require('express');
const router = express.Router();
const MaintenanceIssue = require('../models/MaintenanceIssue');
const Visitor = require('../models/Visitor');
const Announcement = require('../models/Announcement');
const FacultyProfile = require('../models/FacultyProfile');

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
    const visitors = await Visitor.find({ resident: userId }).sort({ createdAt: -1 });
    
    // Fetch announcements populated with Warden's name
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

// Issue Submission Route
router.post(
  '/issues',
  ticketSubmissionLimiter,
  sanitizeFormInputs,
  enforceMaxPendingIssues,
  async (req, res, next) => {
    try {
      const userId = req.user.id || req.user._id;

      await MaintenanceIssue.create({
        resident: userId,
        roomNumber: req.user.roomNumber,
        category: req.body.category,
        description: req.body.description
      });
      res.redirect('/student/dashboard');
    } catch (err) {
      next(err);
    }
  }
);

// Visitor Pass Request Route
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
        passcode: passcode,
        status: 'PENDING'
      });

      res.redirect('/student/dashboard');
    } catch (err) {
      next(err);
    }
  }
);



// Route to render dedicated Faculty View page

router.get('/faculty-directory', async (req, res, next) => {
  try {
    const facultyProfiles = await FacultyProfile.find().populate('user', 'name email');
    
    // 👉 Make sure it renders 'student-faculty-view' here!
    res.render('student-faculty-view', { 
      user: req.user, 
      facultyList: facultyProfiles || [] 
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
