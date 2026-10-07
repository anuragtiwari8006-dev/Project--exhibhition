
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required']
  },
  courseCode: {
    type: String,
    default: 'CS301'
  },
  capturedImage: {
    type: String,
    default: 'FACE_SCAN'
  },
  status: {
    type: String,
    enum: ['PRESENT', 'ABSENT', 'LATE', 'Present', 'Absent', 'Late'],
    default: 'PRESENT'
  },
  verificationMethod: {
    type: String,
    enum: ['FACE_RECOGNITION', 'MANUAL', 'CARD', 'FACE'],
    default: 'FACE_RECOGNITION'
  },
  markedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);