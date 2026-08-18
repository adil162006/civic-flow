import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Complaint } from './src/models/Complaint.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/civicai';

const sampleComplaints = [
  {
    complaintId: 'CF-2026-0001',
    incident_id: 'CF-2026-0001',
    description: 'Large, dangerous pothole near the college main gate. Two scooter riders almost crashed this morning.',
    category: 'Pothole',
    department: 'Roads & Public Works',
    priority: 'critical',
    priorityScore: 95,
    aiConfidence: 96,
    aiReason: 'High commuter density near educational institution combined with deep asphalt fracturing creates immediate accident risk.',
    aiSummary: 'Critical deep pothole near college main entrance',
    location: 'College Main Gate, MG Road',
    address: '102 MG Road, near City College, Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    status: 'In Progress',
    reportCount: 14,
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800&auto=format&fit=crop',
    user_name: 'Rahul Sharma',
    user_phone: '+919876543210',
    history: [
      { status: 'Submitted', message: 'Complaint submitted by citizen', updatedBy: 'Citizen', timestamp: new Date(Date.now() - 36 * 3600 * 1000) },
      { status: 'AI Verified', message: 'AI Engine verified Pothole issue (CRITICAL priority)', updatedBy: 'CivicFlow AI', timestamp: new Date(Date.now() - 35 * 3600 * 1000) },
      { status: 'Assigned', message: 'Assigned to Roads & Public Works (Engineer V. Kumar)', updatedBy: 'Admin', timestamp: new Date(Date.now() - 24 * 3600 * 1000) },
      { status: 'In Progress', message: 'Maintenance team dispatched with asphalt patching unit', updatedBy: 'Roads & Public Works', timestamp: new Date(Date.now() - 4 * 3600 * 1000) },
    ],
  },
  {
    complaintId: 'CF-2026-0002',
    incident_id: 'CF-2026-0002',
    description: 'Overflowing garbage dump outside market area spreading foul smell and attracting stray animals.',
    category: 'Garbage',
    department: 'Sanitation Department',
    priority: 'high',
    priorityScore: 82,
    aiConfidence: 92,
    aiReason: 'Commercial market zone waste accumulation poses immediate public health and sanitation hazard.',
    aiSummary: 'Uncollected market waste dump causing sanitation risk',
    location: 'Central Market Square',
    address: 'Block 4, Central Market, Bengaluru',
    latitude: 12.9750,
    longitude: 77.5980,
    status: 'Assigned',
    reportCount: 8,
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=800&auto=format&fit=crop',
    user_name: 'Ananya Verma',
    user_phone: '+919812345678',
    history: [
      { status: 'Submitted', message: 'Complaint submitted by citizen', updatedBy: 'Citizen', timestamp: new Date(Date.now() - 20 * 3600 * 1000) },
      { status: 'AI Verified', message: 'AI Engine verified Garbage issue (HIGH priority)', updatedBy: 'CivicFlow AI', timestamp: new Date(Date.now() - 19 * 3600 * 1000) },
      { status: 'Assigned', message: 'Assigned to Sanitation Department', updatedBy: 'Admin', timestamp: new Date(Date.now() - 2 * 3600 * 1000) },
    ],
  },
  {
    complaintId: 'CF-2026-0003',
    incident_id: 'CF-2026-0003',
    description: 'Broken streetlight on 5th Cross Road. Entire street remains pitch dark after 7 PM.',
    category: 'Streetlight',
    department: 'Electrical Department',
    priority: 'medium',
    priorityScore: 60,
    aiConfidence: 89,
    aiReason: 'Residential night-time dark spot increases security and pedestrian trip risks.',
    aiSummary: 'Non-functional street light fixture on 5th Cross',
    location: '5th Cross Road, Indiranagar',
    address: '5th Cross Road, Indiranagar Stage 2, Bengaluru',
    latitude: 12.9784,
    longitude: 77.6408,
    status: 'AI Verified',
    reportCount: 3,
    imageUrl: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=800&auto=format&fit=crop',
    user_name: 'Priya Sundaram',
    user_phone: '+919765432109',
    history: [
      { status: 'Submitted', message: 'Complaint submitted by citizen', updatedBy: 'Citizen', timestamp: new Date(Date.now() - 12 * 3600 * 1000) },
      { status: 'AI Verified', message: 'AI Engine verified Streetlight issue (MEDIUM priority)', updatedBy: 'CivicFlow AI', timestamp: new Date(Date.now() - 11 * 3600 * 1000) },
    ],
  },
  {
    complaintId: 'CF-2026-0004',
    incident_id: 'CF-2026-0004',
    description: 'Major clean water pipe burst leaking thousands of liters onto the main road.',
    category: 'Water Leakage',
    department: 'Water Supply Department',
    priority: 'critical',
    priorityScore: 98,
    aiConfidence: 97,
    aiReason: 'Heavy potable water leakage coupled with road flooding risks structural sub-grade erosion.',
    aiSummary: 'Burst main water pipeline discharging onto public road',
    location: 'Koramangala 80ft Road',
    address: 'Near Sony World Junction, Koramangala, Bengaluru',
    latitude: 12.9352,
    longitude: 77.6245,
    status: 'In Progress',
    reportCount: 22,
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?q=80&w=800&auto=format&fit=crop',
    user_name: 'Vikram Mehta',
    user_phone: '+919988776655',
    history: [
      { status: 'Submitted', message: 'Complaint submitted by citizen', updatedBy: 'Citizen', timestamp: new Date(Date.now() - 48 * 3600 * 1000) },
      { status: 'AI Verified', message: 'AI Engine verified Water Leakage (CRITICAL priority)', updatedBy: 'CivicFlow AI', timestamp: new Date(Date.now() - 47 * 3600 * 1000) },
      { status: 'Assigned', message: 'Assigned to Water Supply Emergency Unit', updatedBy: 'Admin', timestamp: new Date(Date.now() - 40 * 3600 * 1000) },
      { status: 'In Progress', message: 'Main valve isolated; replacement pipeline section fitting in progress', updatedBy: 'Water Supply Department', timestamp: new Date(Date.now() - 10 * 3600 * 1000) },
    ],
  },
  {
    complaintId: 'CF-2026-0005',
    incident_id: 'CF-2026-0005',
    description: 'Blocked storm water drain causing stagnant water collection during rains.',
    category: 'Drainage',
    department: 'Drainage & Public Works Department',
    priority: 'high',
    priorityScore: 78,
    aiConfidence: 90,
    aiReason: 'Blocked drainage channel risks localized flooding and mosquito breeding vectors.',
    aiSummary: 'Clogged storm drain producing water stagnation',
    location: 'Jayanagar 4th Block',
    address: '11th Main, Jayanagar 4th Block, Bengaluru',
    latitude: 12.9250,
    longitude: 77.5938,
    status: 'Resolved',
    resolvedAt: new Date(Date.now() - 2 * 3600 * 1000),
    reportCount: 5,
    imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?q=80&w=800&auto=format&fit=crop',
    user_name: 'Sneha Rao',
    user_phone: '+919123456789',
    history: [
      { status: 'Submitted', message: 'Complaint submitted by citizen', updatedBy: 'Citizen', timestamp: new Date(Date.now() - 72 * 3600 * 1000) },
      { status: 'AI Verified', message: 'AI Engine verified Drainage issue (HIGH priority)', updatedBy: 'CivicFlow AI', timestamp: new Date(Date.now() - 71 * 3600 * 1000) },
      { status: 'Assigned', message: 'Assigned to Drainage Department', updatedBy: 'Admin', timestamp: new Date(Date.now() - 48 * 3600 * 1000) },
      { status: 'In Progress', message: 'Silt removal truck deployed', updatedBy: 'Drainage Department', timestamp: new Date(Date.now() - 24 * 3600 * 1000) },
      { status: 'Resolved', message: 'Drain desilted and flow test passed cleanly', updatedBy: 'Drainage Department', timestamp: new Date(Date.now() - 2 * 3600 * 1000) },
    ],
  },
];

async function seedData() {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);

    console.log('[Seed] Dropping collection indexes to clear stale constraints...');
    try {
      await Complaint.collection.dropIndexes();
    } catch (err) {
      // ignore
    }

    console.log('[Seed] Clearing existing complaints...');
    await Complaint.deleteMany({});

    console.log('[Seed] Inserting sample complaints...');
    await Complaint.insertMany(sampleComplaints);

    console.log(`✅ [Seed Success] Successfully seeded ${sampleComplaints.length} demo complaints into MongoDB!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ [Seed Error]:', error.message);
    process.exit(1);
  }
}

seedData();
