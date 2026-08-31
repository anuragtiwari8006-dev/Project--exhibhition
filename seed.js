
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const FacultyProfile = require('./models/FacultyProfile');

const seedDatabase = async () => {
  try {
    // 1. Database Connection
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelDB');
    console.log('MongoDB Connected for Seeding...');

    // 2. Clear Existing Data (Optional - prevents duplicate key errors)
    await User.deleteMany();
    await FacultyProfile.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 3. Create Basic Users (Resident, Warden, Security)
    const Users = [
      {
        name: 'Anurag Tiwari',
        email: 'student@hostel.com',
        password: hashedPassword,
        role: 'resident',
        roomNumber: 'B-302',
        phone: '9876543210'
      },
      {
        name: 'Dr. R. K. Sharma',
        email: 'warden@hostel.com',
        password: hashedPassword,
        role: 'warden',
        phone: '9876543211'
      },
      {
        name: 'Officer Vikram Singh',
        email: 'security@hostel.com',
        password: hashedPassword,
        role: 'security',
        phone: '9876543212'
      }
    ];

    await User.insertMany(Users);
    console.log('✅ Base Users (Resident, Warden, Security) Seeded!');

    // 4. Create Faculty User
    const facultyUser = await User.create({
      name: 'Dr. Rajesh Sharma',
      email: 'rajesh.sharma@college.ac.in',
      password: hashedPassword,
      role: 'faculty',
      phone: '9876543213'
    });

    // 5. Create Linked Faculty Profile
    await FacultyProfile.create({
      user: facultyUser._id,
      department: 'Computer Science & Engineering',
      officeHoursRoom: 'Academic Block A - Room 305',
      isOnLeave: false,
      leaveNotice: '',
      freeSlots: [
        { day: 'Monday', startTime: '10:00 AM', endTime: '11:30 AM' },
        { day: 'Wednesday', startTime: '02:00 PM', endTime: '03:30 PM' },
        { day: 'Friday', startTime: '11:00 AM', endTime: '01:00 PM' }
      ]
    });
    console.log('✅ Faculty User & Profile Seeded!');

    console.log('🚀 All Data Seeded Successfully!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
  }
};

seedDatabase();