const MaintenanceIssue = require('../models/MaintenanceIssue');

// Prevents a student from creating a new ticket if they already have 3 unresolved tickets
const enforceMaxPendingIssues = async (req, res, next) => {
  try {
    const pendingCount = await MaintenanceIssue.countDocuments({
      resident: req.user.id,
      status: { $in: ['Pending', 'In Progress'] }
    });

    if (pendingCount >= 3) {
      return res.status(400).render('error', {
        message: 'You already have 3 active/pending complaints. Please wait until they are resolved before creating a new one.'
      });
    }
    next();
  } catch (err) {
    res.status(500).render('error', { message: 'Server check failed.' });
  }
};

module.exports = { enforceMaxPendingIssues };