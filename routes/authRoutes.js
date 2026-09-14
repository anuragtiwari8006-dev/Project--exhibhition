const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Root Route Redirect
router.get('/', (req, res) => {
  res.redirect('/login');
});

// GET Login Page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Invalid Email or Password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid Email or Password' });
    }

    // Include roomNumber so resident ticket logging doesn't fail
    const payload = {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      roomNumber: user.roomNumber || ''
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_fallback_secret_key', {
      expiresIn: '1d'
    });

    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    });

    if (user.role === 'resident') {
      return res.redirect('/student/dashboard');
    } else if (user.role === 'warden') {
      return res.redirect('/warden/dashboard');
    } else if (user.role === 'security') {
      return res.redirect('/security/dashboard');
    } else if (user.role === 'faculty') {
      return res.redirect('/faculty/dashboard');
    } else {
      return res.redirect('/');
    }

  } catch (err) {
    console.error('Login Error:', err);
    res.render('login', { error: 'An unexpected error occurred. Please try again.' });
  }
});

// GET Logout Route
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;