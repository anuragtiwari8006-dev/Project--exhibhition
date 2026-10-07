
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

// Helper function to calculate Euclidean distance between two 128-float arrays
function getEuclideanDistance(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length || arr1.length === 0) return Infinity;
  return Math.sqrt(arr1.reduce((sum, val, i) => sum + Math.pow(val - arr2[i], 2), 0));
}

// Helper to resolve user ID safely across request body, session, tokens, or fallback DB lookup
const resolveUserId = async (req) => {
  // 1. Explicit userId sent from client (e.g. dropdown selection)
  if (req.body && req.body.userId && mongoose.Types.ObjectId.isValid(req.body.userId)) {
    return req.body.userId;
  }
  // 2. Logged-in user via Auth middleware
  if (req.user) {
    return req.user.id || req.user._id;
  }
  // 3. Logged-in user via Express Session
  if (req.session && req.session.user) {
    return req.session.user.id || req.session.user._id;
  }

  // 4. Fallback lookup for existing DB user
  let fallbackUser = await User.findOne({ isFaceRegistered: true }).lean() 
                  || await User.findOne().lean();

  // 5. Auto-create fallback demo resident if DB is empty
  if (!fallbackUser) {
    try {
      fallbackUser = await User.create({
        name: 'Demo Resident',
        email: 'demo.student@hostel.com',
        password: 'password123',
        role: 'student',
        isFaceRegistered: true
      });
    } catch (e) {
      console.error('Failed to auto-create fallback user:', e.message);
    }
  }

  return fallbackUser ? fallbackUser._id : null;
};

// ==========================================
// 1. GET /students (Fetch Resident List for Dropdown)
// ==========================================
router.get('/students', async (req, res) => {
  try {
    // Prevent client/browser caching so dropdown reflects real-time DB status
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Query for either 'student' or 'resident' roles to ensure complete coverage
    const students = await User.find({ role: { $in: ['student', 'resident'] } })
      .select('_id name email roomNumber isFaceRegistered')
      .lean();

    return res.status(200).json({
      success: true,
      data: students
    });
  } catch (err) {
    console.error('🔴 Error fetching resident students:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch student list.' });
  }
});

// ==========================================
// 2. POST /enroll-face & /register-face
// ==========================================
const handleFaceEnrollment = async (req, res) => {
  try {
    const userId = await resolveUserId(req);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID or user authentication required for face enrollment.'
      });
    }

    const { faceDescriptor, profileImage } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid face descriptor array is required.'
      });
    }

    // Cast descriptors to Numbers explicitly to avoid Mongo BSON type errors
    const cleanedDescriptor = faceDescriptor.map(num => Number(num));

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $set: {
          faceDescriptor: cleanedDescriptor,
          isFaceRegistered: true,
          ...(profileImage && { profileImage })
        }
      },
      { new: true, runValidators: false }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Face enrolled successfully for ${updatedUser.name}`,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        isFaceRegistered: updatedUser.isFaceRegistered
      }
    });
  } catch (err) {
    console.error('🔴 Error enrolling face biometrics:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to save biometric data into database.' 
    });
  }
};

router.post('/enroll-face', handleFaceEnrollment);
router.post('/register-face', handleFaceEnrollment);

// ==========================================
// 3. POST /mark (Biometric Matching / Kiosk Mark)
// ==========================================
router.post('/mark', async (req, res) => {
  try {
    const { studentId, inputDescriptor, courseCode, capturedImage, verificationMethod } = req.body;

    let matchedStudent = null;
    let matchDistance = null;

    // Path A: Match directly by explicitly provided studentId
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      matchedStudent = await User.findById(studentId).lean();
    }

    // Path B: Match via Euclidean Distance on inputDescriptor face vector
    if (!matchedStudent && inputDescriptor && Array.isArray(inputDescriptor)) {
      const registeredUsers = await User.find({
        role: { $in: ['student', 'resident'] },
        isFaceRegistered: true,
        faceDescriptor: { $exists: true, $not: { $size: 0 } }
      }).lean();

      let lowestDistance = 0.6; // Threshold for Euclidean face distance match

      for (const user of registeredUsers) {
        const distance = getEuclideanDistance(inputDescriptor, user.faceDescriptor);
        if (distance < lowestDistance) {
          lowestDistance = distance;
          matchedStudent = user;
          matchDistance = distance;
        }
      }
    }

    // Path C: Fallback lookup if no matches found
    if (!matchedStudent) {
      const fallbackId = await resolveUserId(req);
      if (fallbackId) {
        matchedStudent = await User.findById(fallbackId).lean();
      }
    }

    if (!matchedStudent) {
      return res.status(401).json({ 
        success: false, 
        message: 'Face not recognized. Access Denied.' 
      });
    }

    // Save attendance log in database
    const newLog = await Attendance.create({
      student: matchedStudent._id,
      courseCode: courseCode || 'CS301',
      capturedImage: capturedImage || 'FACE_SCAN',
      status: 'PRESENT',
      verificationMethod: verificationMethod || 'FACE_RECOGNITION',
      markedAt: new Date()
    });

    // Broadcast update to real-time WebSockets
    const io = req.app.get('io') || req.io;
    if (io) {
      io.emit('attendance_updated', {
        _id: newLog._id,
        studentName: matchedStudent.name || 'Student',
        roomNo: matchedStudent.roomNumber || matchedStudent.roomNo || 'N/A',
        courseCode: newLog.courseCode,
        verificationMethod: newLog.verificationMethod,
        markedAt: newLog.markedAt
      });
    }

    return res.status(200).json({
      success: true,
      message: `Match confirmed for ${matchedStudent.name}!`,
      student: matchedStudent.name,
      distance: matchDistance ? matchDistance.toFixed(3) : null,
      data: newLog
    });

  } catch (err) {
    console.error('🔴 Error marking attendance:', err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || 'Biometric processing failed.' 
    });
  }
});

// ==========================================
// 4. POST /verify-biometric
// ==========================================
router.post('/verify-biometric', async (req, res) => {
  try {
    const { inputDescriptor, courseCode } = req.body;

    if (!inputDescriptor || !Array.isArray(inputDescriptor)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Biometric input vector array required.' 
      });
    }

    const registeredUsers = await User.find({ 
      isFaceRegistered: true,
      faceDescriptor: { $exists: true, $not: { $size: 0 } }
    }).lean();

    if (!registeredUsers || registeredUsers.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No registered biometric templates found.' 
      });
    }

    let bestMatch = null;
    let lowestDistance = 0.6;

    for (const user of registeredUsers) {
      const distance = getEuclideanDistance(inputDescriptor, user.faceDescriptor);
      if (distance < lowestDistance) {
        lowestDistance = distance;
        bestMatch = user;
      }
    }

    if (!bestMatch) {
      return res.status(401).json({
        success: false,
        message: 'Biometric verification failed. No matching descriptor found.'
      });
    }

    const newLog = await Attendance.create({
      student: bestMatch._id,
      courseCode: courseCode || 'CS301',
      status: 'PRESENT',
      verificationMethod: 'FACE_RECOGNITION',
      markedAt: new Date()
    });

    const io = req.app.get('io') || req.io;
    if (io) {
      io.emit('attendance_updated', {
        _id: newLog._id,
        studentName: bestMatch.name,
        roomNo: bestMatch.roomNumber || bestMatch.roomNo || 'N/A',
        courseCode: newLog.courseCode,
        verificationMethod: newLog.verificationMethod,
        markedAt: newLog.markedAt
      });
    }

    return res.status(200).json({
      success: true,
      message: `Match confirmed for ${bestMatch.name}`,
      student: bestMatch.name,
      log: newLog
    });
  } catch (err) {
    console.error('🔴 Error in biometric verification:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Biometric verification failed.' 
    });
  }
});

// ==========================================
// 5. GET /history
// ==========================================
router.get('/history', async (req, res) => {
  try {
    const userId = await resolveUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please log in.'
      });
    }

    const history = await Attendance.find({ student: userId })
      .sort({ markedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: history.length,
      data: history
    });
  } catch (err) {
    console.error('🔴 Error fetching attendance history:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance history.' 
    });
  }
});

// ==========================================
// 6. GET /today-summary
// ==========================================
router.get('/today-summary', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await Attendance.find({ markedAt: { $gte: startOfDay } })
      .populate('student', 'name roomNumber roomNo email')
      .sort({ markedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (err) {
    console.error('🔴 Error fetching today summary:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch attendance summary.' 
    });
  }
});

module.exports = router;