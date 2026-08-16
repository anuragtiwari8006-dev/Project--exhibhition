// models/Visitor.js
const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  resident: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  visitorName: { 
    type: String, 
    required: true 
  },
  visitorPhone: { 
    type: String, 
    required: true 
  },
  passcode: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'Pending', 'Expected', 'APPROVED', 'Approved', 'CheckedIn'], 
    default: 'PENDING' 
  },
  checkInTime: { 
    type: Date 
  }
}, { timestamps: true });

module.exports = mongoose.model('Visitor', visitorSchema);