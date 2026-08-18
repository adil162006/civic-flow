import express from 'express';
import { handleRegister, handleLogin, handleSendOtp, handleVerifyOtp } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/send-otp', handleSendOtp);
router.post('/verify-otp', handleVerifyOtp);

export default router;
