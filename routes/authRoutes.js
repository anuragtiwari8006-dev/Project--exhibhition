const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.get('/login', (req, res) => res.render('login'));

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.render('login', { error: 'Invalid Email or Password' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.render('login', { error: 'Invalid Email or Password' });

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name, roomNumber: user.roomNumber },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.cookie('token', token, { httpOnly: true });

  // Direct automatically to appropriate dashboard based on assigned database role
  if (user.role === 'resident') return res.redirect('/student/dashboard');
  if (user.role === 'warden') return res.redirect('/warden/dashboard');
  if (user.role === 'security') return res.redirect('/security/dashboard');
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;