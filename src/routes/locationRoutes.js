import express from 'express';
import { saveLocation, reverseGeocode } from '../controllers/locationController.js';

const router = express.Router();

router.post('/save-location', saveLocation);
router.get('/reverse-geocode', reverseGeocode);
router.get('/location/reverse', reverseGeocode);

export default router;

