const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  changed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  service_request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    required: true,
  },
  new_status: {
    type: String,
    required: true,
  },
  previous_status: {
    type: String,
    default: null, // Null for the first status
  },
  changed_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('StatusHistory', statusHistorySchema);