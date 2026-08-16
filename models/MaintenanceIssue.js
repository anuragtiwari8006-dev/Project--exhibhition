const mongoose = require('mongoose');

const maintenanceIssueSchema = new mongoose.Schema({
  resident: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roomNumber: { type: String, required: true },
  category: { type: String, enum: ['Plumbing', 'Electrical', 'Carpentry', 'Cleanliness', 'Other'], required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('MaintenanceIssue', maintenanceIssueSchema);