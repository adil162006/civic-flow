import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Complaint } from '../models/Complaint.js';
import { analyzeCivicComplaint } from '../services/aiService.js';
import { uploadToCloudinary } from '../services/cloudinaryService.js';
import { checkForDuplicateComplaint } from '../utils/duplicateDetector.js';
import { sendEmailNotification, sendCitizenComplaintConfirmationEmail } from '../services/emailService.js';

/**
 * Handle /upload/presign (Generates presigned upload URL or endpoint metadata for frontend compatibility)
 */
export async function handlePresignUpload(req, res) {
  try {
    const { fileName } = req.body || {};
    const incident_id = uuidv4();
    const extension = (fileName && path.extname(fileName)) || '.jpg';
    const s3Key = `complaints/${incident_id}${extension}`;
    const upload_url = `http://localhost:${process.env.PORT || 5000}/api/upload/direct/${incident_id}`;

    return res.status(200).json({
      incident_id,
      upload_url,
      s3_key: s3Key,
    });
  } catch (error) {
    console.error('[UploadController] handlePresignUpload error:', error);
    return res.status(500).json({ error: 'Could not generate upload URL' });
  }
}

/**
 * Handle direct file upload & Gemini Multimodal Action Engine AI Processing
 * Route: POST /api/upload (or /api/ai/analyze)
 */
export async function handleDirectUpload(req, res) {
  try {
    const file = req.file;
    const userDescription = req.body.description || req.body.userNote || req.body.user_note || '';
    let locationData = {
      address: '',
      latitude: null,
      longitude: null,
    };

    if (req.body.location) {
      if (typeof req.body.location === 'object') {
        locationData = { ...req.body.location };
      } else if (typeof req.body.location === 'string') {
        try {
          const parsed = JSON.parse(req.body.location);
          if (parsed && typeof parsed === 'object') {
            locationData = { ...parsed };
          } else {
            locationData.address = req.body.location;
          }
        } catch (e) {
          locationData.address = req.body.location;
        }
      }
    }

    if (!locationData.address) {
      locationData.address = req.body.address || '';
    }
    if (locationData.latitude === null || locationData.latitude === undefined) {
      const parsedLat = Number(req.body.latitude);
      locationData.latitude = Number.isFinite(parsedLat) ? parsedLat : null;
    } else {
      locationData.latitude = Number(locationData.latitude);
      if (!Number.isFinite(locationData.latitude)) locationData.latitude = null;
    }
    if (locationData.longitude === null || locationData.longitude === undefined) {
      const parsedLon = Number(req.body.longitude);
      locationData.longitude = Number.isFinite(parsedLon) ? parsedLon : null;
    } else {
      locationData.longitude = Number(locationData.longitude);
      if (!Number.isFinite(locationData.longitude)) locationData.longitude = null;
    }

    const latitude = locationData.latitude;
    const longitude = locationData.longitude;
    const rawLocation = locationData.address;
    const userEmail = (req.body.userEmail || req.body.user_email || 'citizen@civicflow.ai').trim().toLowerCase();

    let imageUrl = '';
    let s3Key = '';

    if (file) {
      s3Key = `complaints/${file.filename}`;
      imageUrl = `/uploads/${file.filename}`;

      // Upload to Cloudinary if credentials provided
      if (file.path) {
        const cloudinaryResult = await uploadToCloudinary(file.path, 'civicflow-complaints');
        if (cloudinaryResult && cloudinaryResult.secure_url) {
          imageUrl = cloudinaryResult.secure_url;
        }
      }
    }

    // 1. Run Gemini 2.5 Flash Multimodal AI Engine
    const imageBuffer = file ? (file.buffer || (file.path && fs.existsSync(file.path) ? fs.readFileSync(file.path) : null)) : null;
    const mimeType = file ? file.mimetype : 'image/jpeg';

    const aiResult = await analyzeCivicComplaint({
      userDescription,
      imageBuffer,
      mimeType,
      rawLocation,
    });

    // 2. Check for Duplicate Complaints
    const duplicateCheck = await checkForDuplicateComplaint({
      category: aiResult.category,
      latitude,
      longitude,
      location: aiResult.location,
    });

    // 3. Generate Complaint ID (CF-2026-XXXX)
    const count = await Complaint.countDocuments();
    const formattedNum = String(count + 1).padStart(4, '0');
    const complaintId = `CF-2026-${formattedNum}`;
    const incident_id = req.body.incident_id || uuidv4();

    // Map priority score (0-100)
    const priorityMap = { critical: 95, high: 80, medium: 55, low: 30 };
    const priorityScore = priorityMap[aiResult.priority.toLowerCase()] || 70;

    // 4. Create Complaint Document
    const newComplaint = new Complaint({
      complaintId,
      incident_id,
      userId: req.body.userId || 'anonymous',
      description: userDescription || aiResult.summary,
      imageUrl,
      s3Key,
      category: aiResult.category,
      department: aiResult.department,
      priority: aiResult.priority,
      priorityScore,
      aiConfidence: aiResult.confidence,
      aiReason: aiResult.reason,
      aiSummary: aiResult.summary,
      location: {
        address: rawLocation || aiResult.location || 'Reported Location',
        latitude,
        longitude,
      },
      address: rawLocation || aiResult.location || '',
      latitude,
      longitude,
      status: 'AI Verified',
      reportCount: 1,
      duplicateOf: duplicateCheck.isDuplicate ? duplicateCheck.possibleDuplicate.complaintId : null,
      history: [
        {
          status: 'Submitted',
          message: 'Complaint submitted by citizen',
          updatedBy: 'Citizen',
          timestamp: new Date(),
        },
        {
          status: 'AI Verified',
          message: `AI Action Engine verified as ${aiResult.category} (${aiResult.priority.toUpperCase()} priority)`,
          updatedBy: 'CivicFlow AI',
          timestamp: new Date(),
        },
      ],
      user_name: req.body.userName || req.body.user_name || 'Citizen',
      user_email: userEmail,
      user_note: userDescription,
    });

    await newComplaint.save();

    // 5. If duplicate found, increment report count on original complaint
    if (duplicateCheck.isDuplicate && duplicateCheck.possibleDuplicate) {
      await Complaint.updateOne(
        { _id: duplicateCheck.possibleDuplicate._id },
        {
          $inc: { reportCount: 1 },
          $addToSet: { relatedComplaints: complaintId },
        }
      );
    }

    // 6. Send Email Notifications
    // Notify Ops Team
    sendEmailNotification({
      incident_id: complaintId,
      category: aiResult.category,
      severity: aiResult.priority.toUpperCase(),
      department: aiResult.department,
      description: aiResult.reason,
    });

    // Notify Reporting Citizen
    if (userEmail) {
      sendCitizenComplaintConfirmationEmail({
        recipient: userEmail,
        complaintId,
        category: aiResult.category,
        priority: aiResult.priority,
        department: aiResult.department,
        description: userDescription || aiResult.summary,
        address: rawLocation || aiResult.location || 'Reported Location',
        status: newComplaint.status,
      });
    }

    return res.status(200).json({
      success: true,
      status: 'Processed',
      complaintId,
      incident_id,
      category: aiResult.category,
      department: aiResult.department,
      priority: aiResult.priority,
      confidence: aiResult.confidence,
      reason: aiResult.reason,
      summary: aiResult.summary,
      location: aiResult.location,
      imageUrl,
      possibleDuplicate: duplicateCheck.isDuplicate ? duplicateCheck.possibleDuplicate : null,
      duplicateMessage: duplicateCheck.message,
      complaint: newComplaint,
    });
  } catch (error) {
    console.error('[UploadController] handleDirectUpload error:', error);
    return res.status(500).json({ error: 'Failed to process complaint' });
  }
}
