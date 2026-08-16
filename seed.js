require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await User.deleteMany(); // Reset users collection for testing

    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = [
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

    await User.insertMany(users);
    console.log('Database Seeded Successfully!');
    process.exit();
  } catch (err) {
    console.error('Seeding Failed:', err);
    process.exit(1);
  }
};

seedUsers();