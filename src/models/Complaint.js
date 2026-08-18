import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    incident_id: {
      type: String,
      index: true,
    },
    userId: {
      type: String,
      default: 'anonymous',
    },
    description: {
      type: String,
      required: true,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    s3Key: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: true,
      enum: ['Pothole', 'Garbage', 'Streetlight', 'Water Leakage', 'Drainage', 'Road Damage', 'Other', 'pothole', 'garbage', 'streetlight', 'water', 'unknown', 'Unknown'],
      default: 'Other',
    },
    department: {
      type: String,
      default: 'Roads & Public Works',
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low', 'Critical', 'High', 'Medium', 'Low'],
      default: 'medium',
    },
    priorityScore: {
      type: Number,
      default: 50,
    },
    aiConfidence: {
      type: Number,
      default: 85,
    },
    aiReason: {
      type: String,
      default: 'Analyzed by CivicFlow AI Multimodal Action Engine.',
    },
    aiSummary: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: 'Reported Location',
    },
    address: {
      type: String,
      default: '',
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['Submitted', 'AI Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'submitted', 'assigned', 'in_progress', 'resolved', 'closed', 'Pending'],
      default: 'Submitted',
    },
    reportCount: {
      type: Number,
      default: 1,
    },
    duplicateOf: {
      type: String,
      default: null,
    },
    relatedComplaints: {
      type: [String],
      default: [],
    },
    history: [
      {
        status: { type: String, required: true },
        message: { type: String, default: '' },
        updatedBy: { type: String, default: 'System' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    user_name: {
      type: String,
      default: 'Citizen',
    },
    user_phone: {
      type: String,
      default: '',
      index: true,
    },
    user_note: {
      type: String,
      default: '',
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Complaint = mongoose.model('Complaint', complaintSchema);
