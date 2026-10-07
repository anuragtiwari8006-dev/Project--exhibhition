
const express = require('express');
const router = express.Router();
const FacultyProfile = require('../models/FacultyProfile');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { authenticateUser, requireRole } = require('../middleware/auth');

// Apply authentication & authorization middleware globally to all faculty routes
router.use(authenticateUser, requireRole('faculty'));

// ==========================================
// 1. GET /faculty/dashboard
// ==========================================
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    // Fetch faculty profile & populate user details
    let profile = await FacultyProfile.findOne({ user: userId }).populate('user', 'name email');

    // Auto-create profile record if it doesn't exist yet for the logged-in user
    if (!profile) {
      profile = await FacultyProfile.create({ user: userId });
      profile = await FacultyProfile.findById(profile._id).populate('user', 'name email');
    }

    // Retrieve attendance records directly from MongoDB sorted by newest first
    // (Removed rigid startOfDay filtering to ensure records persist across refreshes)
    const todayLogs = await Attendance.find({})
      .populate('student', 'name roomNumber roomNo email profileImage')
      .sort({ markedAt: -1 })
      .limit(100)
      .lean();

    const totalStudents = await User.countDocuments({ role: 'resident' });

    res.render('faculty-dashboard', {
      user: req.user,
      profile: profile,
      todayLogs: todayLogs || [],
      attendances: todayLogs || [], // Fallback alias for legacy views
      todayScannedCount: todayLogs ? todayLogs.length : 0,
      totalStudents: totalStudents,
      courseCode: 'CS301'
    });
  } catch (err) {
    console.error('Faculty Dashboard Fetch Error:', err);
    res.render('faculty-dashboard', {
      user: req.user,
      profile: {},
      todayLogs: [],
      attendances: [],
      todayScannedCount: 0,
      totalStudents: 0,
      courseCode: 'CS301'
    });
  }
});

// ==========================================
// 2. POST /faculty/update-room
// ==========================================
router.post('/update-room', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { officeHoursRoom, department } = req.body;

    await FacultyProfile.findOneAndUpdate(
      { user: userId },
      { officeHoursRoom, department },
      { upsert: true, new: true }
    );

    res.redirect('/faculty/dashboard');
  } catch (err) {
    console.error('Error updating faculty room info:', err);
    next(err);
  }
});

// ==========================================
// 3. POST /faculty/add-slot
// ==========================================
router.post('/add-slot', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { day, startTime, endTime } = req.body;

    if (day && startTime && endTime) {
      await FacultyProfile.findOneAndUpdate(
        { user: userId },
        { $push: { freeSlots: { day, startTime, endTime } } },
        { upsert: true }
      );
    }

    res.redirect('/faculty/dashboard');
  } catch (err) {
    console.error('Error adding free slot:', err);
    next(err);
  }
});

// ==========================================
// 4. POST /faculty/delete-slot
// ==========================================
router.post('/delete-slot', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { slotId } = req.body;

    if (slotId) {
      await FacultyProfile.findOneAndUpdate(
        { user: userId },
        { $pull: { freeSlots: { _id: slotId } } }
      );
    }

    res.redirect('/faculty/dashboard');
  } catch (err) {
    console.error('Error deleting free slot:', err);
    next(err);
  }
});

// ==========================================
// 5. POST /faculty/update-leave
// ==========================================
router.post('/update-leave', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { isOnLeave, leaveNotice } = req.body;

    await FacultyProfile.findOneAndUpdate(
      { user: userId },
      {
        isOnLeave: isOnLeave === 'on' || isOnLeave === 'true' || isOnLeave === true,
        leaveNotice: leaveNotice || ''
      },
      { upsert: true }
    );

    res.redirect('/faculty/dashboard');
  } catch (err) {
    console.error('Error updating leave status:', err);
    next(err);
  }
});

// ==========================================
// 6. POST /faculty/manual-override
// ==========================================
router.post('/manual-override', async (req, res, next) => {
  try {
    const { studentId, courseCode } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    const newOverride = await Attendance.create({
      student: studentId,
      courseCode: courseCode || 'CS301',
      capturedImage: 'MANUAL_FACULTY_OVERRIDE',
      status: 'PRESENT',
      verificationMethod: 'FACULTY_OVERRIDE',
      markedAt: new Date()
    });

    // Notify connected clients via Socket.IO if instance exists
    const io = req.app.get('io');
    if (io) {
      const student = await User.findById(studentId);
      io.emit('attendance_updated', {
        _id: newOverride._id,
        studentName: student ? student.name : 'Student',
        roomNo: student ? (student.roomNumber || student.roomNo || 'N/A') : 'N/A',
        courseCode: newOverride.courseCode,
        verificationMethod: newOverride.verificationMethod,
        markedAt: newOverride.markedAt
      });
    }

    res.redirect('/faculty/dashboard');
  } catch (err) {
    console.error('Error in manual attendance override:', err);
    next(err);
  }
});

// ==========================================
// 7. GET /faculty/students-list
// ==========================================
router.get('/students-list', async (req, res, next) => {
  try {
    const students = await User.find({ role: 'resident' })
      .select('name email roomNumber roomNo profileImage isFaceRegistered')
      .lean();

    res.json({
      success: true,
      count: students.length,
      students: students
    });
  } catch (err) {
    console.error('Error fetching students list:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student directory' });
  }
});

module.exports = router;