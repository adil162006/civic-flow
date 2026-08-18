import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { handlePresignUpload, handleDirectUpload } from '../controllers/uploadController.js';

const router = express.Router();

// Ensure uploads folder exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Disk Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Routes
router.post('/presign', handlePresignUpload);
router.post('/', upload.single('image'), handleDirectUpload);
router.post('/direct/:id', upload.single('image'), handleDirectUpload);

export default router;
