
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['resident', 'warden', 'security', 'faculty'], 
    required: true 
  },
  
  roomNumber: { type: String }, // Populated for residents
  profileImage: { type: String, default: '' }, // Base64 snapshot storage
  
  // Vector array storing 128 facial landmark features
  isFaceRegistered: { type: Boolean, default: false },
  faceDescriptor: {
    type: [Number],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);