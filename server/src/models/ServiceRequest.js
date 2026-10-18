const mongoose = require('mongoose');

const statuses = [
  'submitted',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'rejected',
];

const serviceRequestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ['roads', 'water', 'waste', 'street_lighting', 'parks', 'other'],
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      required: true,
    },
    status: {
      type: String,
      enum: statuses,
      default: 'submitted',
      required: true,
      index: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    dueAt: {
      type: Date,
      default: null,
      index: true,
    },
    statusHistory: [
      {
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        fromStatus: { type: String, enum: statuses, required: true },
        toStatus: { type: String, enum: statuses, required: true },
        comment: { type: String, trim: true, maxlength: 500, default: '' },
        changedAt: { type: Date, required: true, default: Date.now },
      },
    ],
    comments: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        body: { type: String, required: true, trim: true, maxlength: 2000 },
        createdAt: { type: Date, required: true, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

serviceRequestSchema.index({ createdAt: -1 });
serviceRequestSchema.index({ status: 1, dueAt: 1 });
serviceRequestSchema.index({ requester: 1, createdAt: -1 });
serviceRequestSchema.index({ assignee: 1, status: 1, createdAt: -1 });
serviceRequestSchema.index({ title: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
