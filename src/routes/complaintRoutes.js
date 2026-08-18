import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  submitComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
} from '../controllers/complaintController.js';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `resolved-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/', submitComplaint);
router.get('/', getComplaints);
router.get('/:id', getComplaintById);
router.patch('/:id/status', upload.single('resolutionImage'), updateComplaintStatus);
router.post('/:id/resolve', upload.single('resolutionImage'), updateComplaintStatus);

export default router;
