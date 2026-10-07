
require('dotenv').config();
const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');

// Import Custom Middlewares
const { sanitizeFormInputs } = require('./middleware/validateInput');
const errorHandler = require('./middleware/errorHandler');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const securityRoutes = require('./routes/securityRoutes');
const wardenRoutes = require('./routes/wardenRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Connect to Database
connectDB();

// 1. INCREASE BODY LIMIT FIRST (Required for Base64 Images)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Attach Socket.IO to req object globally
app.use((req, res, next) => {
  req.io = io;
  req.app.set('io', io); // Ensures req.app.get('io') works inside routes
  next();
});

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve Static Assets (Public Directory)
app.use(express.static(path.join(__dirname, 'public')));

// Register Models
require('./models/User');
require('./models/FacultyProfile');

// View Routes
app.get('/kiosk', (req, res) => res.render('kiosk'));
app.get('/enroll-face', (req, res) => res.render('enroll-face'));

// 2. MOUNT ATTENDANCE ROUTES (Mounted under both paths to ensure total compatibility)
app.use('/api/attendance', attendanceRoutes);
app.use('/attendance', attendanceRoutes);

// Apply sanitizer to remaining standard form inputs
app.use(sanitizeFormInputs);

// Mount Application Routes
app.use('/', authRoutes);
app.use('/student', studentRoutes);
app.use('/security', securityRoutes);
app.use('/warden', wardenRoutes);
app.use('/faculty', facultyRoutes);

// Socket.IO Connection Event Handler
io.on('connection', (socket) => {
  console.log('⚡ Client connected to WebSocket server:', socket.id);
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Hostel System Server Running on Port ${PORT}`));