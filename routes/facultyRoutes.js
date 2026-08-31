const express = require('express');
const router = express.Router();
const FacultyProfile = require('../models/FacultyProfile');
const User = require('../models/User');
const { authenticateUser, requireRole } = require('../middleware/auth');

router.use(authenticateUser, requireRole('faculty'));

// GET Faculty Dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;

    // Find profile & populate user details
    let profile = await FacultyProfile.findOne({ user: userId }).populate('user', 'name email');

    // Auto-create profile if missing for logged-in faculty
    if (!profile) {
      profile = await FacultyProfile.create({ user: userId });
      profile = await FacultyProfile.findById(profile._id).populate('user', 'name email');
    }

    res.render('faculty-dashboard', {
      user: req.user,
      profile: profile
    });
  } catch (err) {
    console.error('Faculty Dashboard Fetch Error:', err);
    next(err);
  }
});

// POST Update Room Details
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
    next(err);
  }
});

// POST Add Slot
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
    next(err);
  }
});

// POST Delete Slot
router.post('/delete-slot', async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const { slotId } = req.body;

    await FacultyProfile.findOneAndUpdate(
      { user: userId },
      { $pull: { freeSlots: { _id: slotId } } }
    );
    res.redirect('/faculty/dashboard');
  } catch (err) {
    next(err);
  }
});

// POST Update Leave
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
    next(err);
  }
});

module.exports = router;
