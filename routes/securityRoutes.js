const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const { authenticateUser, requireRole } = require('../middleware/auth');

// Restrict all routes to Security role
router.use(authenticateUser, requireRole('security'));

// GET Security Dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const recentLogs = await Visitor.find({ status: 'CheckedIn' })
      .populate('resident', 'name roomNumber')
      .sort({ updatedAt: -1 });

    res.render('security-dashboard', { 
      user: req.user, 
      recentLogs: recentLogs || [],
      error: null,
      success: null
    });
  } catch (err) {
    next(err);
  }
});

// POST Verify Passcode
router.post('/verify-passcode', async (req, res, next) => {
  try {
    const inputPasscode = req.body.passcode ? String(req.body.passcode).trim() : '';

    const recentLogs = await Visitor.find({ status: 'CheckedIn' })
      .populate('resident', 'name roomNumber')
      .sort({ updatedAt: -1 });

    if (!inputPasscode) {
      return res.render('security-dashboard', { 
        user: req.user, 
        recentLogs, 
        error: 'Please enter a 6-digit passcode.',
        success: null 
      });
    }

    // Find visitor by passcode (regardless of status first)
    const visitor = await Visitor.findOne({ passcode: inputPasscode });

    if (!visitor) {
      return res.render('security-dashboard', { 
        user: req.user, 
        recentLogs, 
        error: 'Invalid Passcode: Code not found in database.',
        success: null 
      });
    }

    // Reject if today is past the applied visit date
    if (visitor.visitDate) {
      const visitDayEnd = new Date(visitor.visitDate);
      visitDayEnd.setHours(23, 59, 59, 999);

      if (new Date() > visitDayEnd) {
        visitor.status = 'EXPIRED';
        await visitor.save();

        return res.render('security-dashboard', { 
          user: req.user, 
          recentLogs, 
          error: 'Passcode Expired: The applied visit date has passed.',
          success: null 
        });
      }
    }

    // Normalize status for comparison
    const currentStatus = String(visitor.status).toUpperCase();

    if (currentStatus === 'CHECKEDIN') {
      return res.render('security-dashboard', { 
        user: req.user, 
        recentLogs, 
        error: 'Passcode Expired: Visitor has already checked in.',
        success: null 
      });
    }

    if (currentStatus === 'PENDING' || currentStatus === 'EXPECTED') {
      return res.render('security-dashboard', { 
        user: req.user, 
        recentLogs, 
        error: 'Access Denied: Warden has not approved this pass yet.',
        success: null 
      });
    }

    // Allow entry if status is APPROVED or Approved
    if (currentStatus === 'APPROVED') {
      visitor.status = 'CheckedIn';
      visitor.checkInTime = new Date();
      await visitor.save();

      const updatedLogs = await Visitor.find({ status: 'CheckedIn' })
        .populate('resident', 'name roomNumber')
        .sort({ updatedAt: -1 });

      return res.render('security-dashboard', { 
        user: req.user, 
        recentLogs: updatedLogs, 
        error: null,
        success: `Entry Approved for Visitor: ${visitor.visitorName}` 
      });
    }

    return res.render('security-dashboard', { 
      user: req.user, 
      recentLogs, 
      error: 'Invalid or Expired Passcode.',
      success: null 
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
