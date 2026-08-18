import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import complaintRoutes from './routes/complaintRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import locationRoutes from './routes/locationRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Connect MongoDB
connectDB();

// Middleware
app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header include tools such as curl and Postman.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads folder
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);

app.use('/upload', uploadRoutes);
app.use('/api/upload', uploadRoutes);

app.use('/ai', uploadRoutes);
app.use('/api/ai', uploadRoutes);

app.use('/complaints', complaintRoutes);
app.use('/api/complaints', complaintRoutes);

app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);

app.use(locationRoutes);
app.use('/api', locationRoutes);

// Health Endpoint
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'CivicFlow AI Backend Engine',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.send('CivicFlow AI Backend Engine is Active');
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CivicFlow AI Backend running on http://localhost:${PORT}`);
  console.log(`📁 Static uploads path: http://localhost:${PORT}/uploads`);
  console.log(`====================================================`);
});
