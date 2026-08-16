require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Import Custom Middlewares
const { sanitizeFormInputs } = require('./middleware/validateInput');
const errorHandler = require('./middleware/errorHandler');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const securityRoutes = require('./routes/securityRoutes');
const wardenRoutes = require('./routes/wardenRoutes');

const app = express();

// Connect to Database
connectDB();

// Global Application Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(sanitizeFormInputs); // Sanitize all incoming payload data globally

// View Engine
app.set('view engine', 'ejs');

// Mount Modular Routes
app.use('/', authRoutes);
app.use('/student', studentRoutes);
app.use('/security', securityRoutes);
app.use('/warden', wardenRoutes);

// Centralized Error Handling Middleware (Must be registered last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Hostel System Server Running on Port ${PORT}`));