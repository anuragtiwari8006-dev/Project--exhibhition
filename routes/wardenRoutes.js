const express = require('express');
const router = express.Router();
const MaintenanceIssue = require('../models/MaintenanceIssue');
const Visitor = require('../models/Visitor');
const Announcement = require('../models/Announcement');
const { authenticateUser, requireRole } = require('../middleware/auth');

// Protect all routes below for wardens only
router.use(authenticateUser, requireRole('warden'));

// Warden Dashboard Route
router.get('/dashboard', async (req, res, next) => {
  try {
    const issues = await MaintenanceIssue.find()
      .populate('resident', 'name roomNumber');

    const pendingVisitors = await Visitor.find({
      status: { $in: ['PENDING', 'Pending', 'Expected'] }
    }).populate('resident', 'name roomNumber');

    // Fetch announcements with Warden details populated
    const announcements = await Announcement.find()
      .populate('postedBy', 'name')
      .sort({ createdAt: -1 });

    res.render('warden-dashboard', { 
      user: req.user, 
      issues: issues || [], 
      pendingVisitors: pendingVisitors || [], 
      announcements: announcements || [] 
    });
  } catch (err) {
    next(err);
  }
});

// POST Create Announcement Route (Fixes Cast to ObjectId Error)
router.post('/announcements', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    await Announcement.create({
      title: req.body.title,
      content: req.body.content,
      postedBy: userId // Stores ObjectId reference
    });
    res.redirect('/warden/dashboard');
  } catch (err) {
    next(err);
  }
});

// POST Update Maintenance Issue Status
router.post('/issues/update/:id', async (req, res, next) => {
  try {
    const updateData = { status: req.body.status };
    
    if (req.body.status === 'Resolved') {
      updateData.resolvedAt = new Date();
    } else {
      updateData.resolvedAt = null;
    }

    await MaintenanceIssue.findByIdAndUpdate(req.params.id, updateData);
    res.redirect('/warden/dashboard');
  } catch (err) {
    next(err);
  }
});

// POST Approve Visitor Pass Request
router.post('/visitors/approve/:id', async (req, res, next) => {
  try {
    await Visitor.findByIdAndUpdate(req.params.id, { 
      status: 'APPROVED' 
    });
    res.redirect('/warden/dashboard');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
