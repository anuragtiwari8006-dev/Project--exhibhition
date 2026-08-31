
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');



// GET Login Page
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// POST Login Route (Handles Resident, Warden, Security, and Faculty)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Invalid Email or Password' });
    }

    // 2. Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('login', { error: 'Invalid Email or Password' });
    }

    // 3. Construct JWT Payload with User ID, Name, and Role
   
    // Inside POST /login in routes/auth.js
const payload = {
  id: user._id,      // <-- Make sure 'id' is defined
  _id: user._id,     // <-- Fallback
  name: user.name,
  email: user.email,
  role: user.role
};
    // 4. Sign JWT Token
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_fallback_secret_key', {
      expiresIn: '1d'
    });

    // 5. Save Token in HttpOnly Cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    // 6. Role-Based Redirection Flow
    if (user.role === 'resident') {
      return res.redirect('/student/dashboard');
    } else if (user.role === 'warden') {
      return res.redirect('/warden/dashboard');
    } else if (user.role === 'security') {
      return res.redirect('/security/dashboard');
    } else if (user.role === 'faculty') {
      return res.redirect('/faculty/dashboard'); // <-- FACULTY REDIRECT
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