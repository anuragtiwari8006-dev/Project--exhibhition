
// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const MaintenanceIssue = require('../models/MaintenanceIssue');
const Visitor = require('../models/Visitor');
const Announcement = require('../models/Announcement');
const FacultyProfile = require('../models/FacultyProfile');
const Attendance = require('../models/Attendance');
const { detectUrgency } = require('../utils/urgencyDetector');

// Middlewares
const { authenticateUser, requireRole } = require('../middleware/auth');
const { ticketSubmissionLimiter, visitorPassLimiter } = require('../middleware/rateLimiter');
const { sanitizeFormInputs } = require('../middleware/validateInput');
const { enforceMaxPendingIssues } = require('../middleware/checkActiveTickets');

// Protect all routes below for residents only
router.use(authenticateUser, requireRole('resident'));

// Resident Dashboard Route (Includes Attendance Metrics)
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

        if (pass.visitDate) {
          const visitDayEnd = new Date(pass.visitDate);
          visitDayEnd.setHours(23, 59, 59, 999);

          if (now > visitDayEnd && pass.status !== 'CheckedIn' && pass.status !== 'EXPIRED') {
            await Visitor.findByIdAndUpdate(pass._id, { status: 'EXPIRED' });
            pass.status = 'EXPIRED';
          }
        }

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

    // Attendance Calculations for Student
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayAttendance = await Attendance.findOne({
      student: userId,
      markedAt: { $gte: startOfDay }
    });

    const pastAttendanceLogs = await Attendance.find({ student: userId })
      .sort({ markedAt: -1 })
      .limit(10);

    const totalClasses = await Attendance.countDocuments({ student: userId });
    const attendedClasses = await Attendance.countDocuments({ student: userId, status: 'PRESENT' });
    const overallPercentage = totalClasses > 0 ? Math.round((attendedClasses / totalClasses) * 100) : 100;

    res.render('student-dashboard', { 
      user: req.user, 
      issues: issues || [], 
      visitors: visitors || [], 
      announcements: announcements || [],
      todayAttendance,
      pastAttendanceLogs,
      overallPercentage
    });
  } catch (err) {
    next(err);
  }
});

// POST Route for Biometric/Camera Attendance Submission
router.post('/mark-attendance', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { capturedImage, courseCode } = req.body;

    if (!capturedImage) {
      return res.status(400).json({ success: false, message: 'Image capture data is missing' });
    }

    const newLog = await Attendance.create({
      student: userId,
      courseCode: courseCode || 'CS301',
      capturedImage: capturedImage,
      status: 'PRESENT',
      verificationMethod: 'BIOMETRIC_KIOSK'
    });

    res.json({ success: true, message: 'Attendance marked successfully', log: newLog });
  } catch (err) {
    next(err);
  }
});

// Maintenance Issue Submission Route
router.post(
  '/issues',
  ticketSubmissionLimiter,
  sanitizeFormInputs,
  enforceMaxPendingIssues,
  async (req, res, next) => {
    try {
      const userId = req.user.id || req.user._id;
      const { category, description } = req.body;

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