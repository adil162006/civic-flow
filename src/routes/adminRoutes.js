import express from 'express';
import { getAdminStats, getAdminComplaints } from '../controllers/adminController.js';

const router = express.Router();

router.get('/stats', getAdminStats);
router.get('/complaints', getAdminComplaints);

export default router;
