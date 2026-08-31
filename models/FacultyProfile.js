const mongoose = require('mongoose');

const facultyProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  officeHoursRoom: { 
    type: String, 
    default: 'Not Assigned' 
  },
  department: { 
    type: String 
  },
  isOnLeave: { 
    type: Boolean, 
    default: false 
  },
  leaveNotice: { 
    type: String, 
    default: '' 
  },
  freeSlots: [
    {
      day: { 
        type: String, 
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] 
      },
      startTime: { type: String }, // e.g., "10:00 AM"
      endTime: { type: String }    // e.g., "11:30 AM"
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('FacultyProfile', facultyProfileSchema);