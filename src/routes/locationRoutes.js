import express from 'express';
import { saveLocation } from '../controllers/locationController.js';

const router = express.Router();

router.post('/save-location', saveLocation);

export default router;
