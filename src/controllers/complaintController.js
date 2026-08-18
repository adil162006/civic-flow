import { Complaint } from '../models/Complaint.js';
import { sendStatusUpdateEmail } from '../services/emailService.js';

/**
 * Submit or Finalize Complaint
 * Route: POST /complaints
 */
export async function submitComplaint(req, res) {
  try {
    const data = req.body || {};
    const complaintId = data.complaintId || data.complaint_id;
    const incident_id = data.incident_id || data.s3Key;
    const userEmail = (data.userEmail || data.user_email || '').trim().toLowerCase();

    if (!userEmail) {
      return res.status(400).json({ error: 'Email is required to submit and track a complaint' });
    }

    let complaint = null;

    if (complaintId) {
      complaint = await Complaint.findOne({ complaintId });
    } else if (incident_id) {
      complaint = await Complaint.findOne({ incident_id });
    }

    if (!complaint) {
      // Create new complaint
      const count = await Complaint.countDocuments();
      const newId = `CF-2026-${String(count + 1).padStart(4, '0')}`;

      complaint = new Complaint({
        complaintId: newId,
        description: data.description || data.userNote || 'Civic issue report',
        category: data.category || 'Pothole',
        department: data.department || 'Roads & Public Works',
        priority: data.priority || 'high',
        location: data.location || data.address || 'Reported Location',
        address: data.address || '',
        latitude: parseFloat(data.latitude) || null,
        longitude: parseFloat(data.longitude) || null,
        user_name: data.userName || data.user_name || 'Citizen',
        user_email: userEmail,
        imageUrl: data.imageUrl || '',
        status: 'Submitted',
        history: [
          {
            status: 'Submitted',
            message: 'Complaint submitted by citizen',
            updatedBy: 'Citizen',
            timestamp: new Date(),
          },
        ],
      });
      await complaint.save();
    } else {
      // Update existing complaint
      if (data.userNote) complaint.user_note = data.userNote;
      if (data.userName) complaint.user_name = data.userName;
      if (userEmail) complaint.user_email = userEmail;
      if (data.latitude) complaint.latitude = parseFloat(data.latitude);
      if (data.longitude) complaint.longitude = parseFloat(data.longitude);
      if (data.address) complaint.address = data.address;
      if (data.status) complaint.status = data.status;

      complaint.history.push({
        status: 'Submitted',
        message: 'Complaint details finalized by citizen',
        updatedBy: 'Citizen',
        timestamp: new Date(),
      });

      await complaint.save();
    }

    return res.status(200).json({
      success: true,
      complaintId: complaint.complaintId,
      incident_id: complaint.incident_id || complaint.complaintId,
      status: complaint.status,
      estimatedResolution: data.estimatedResolution || '2-3 days',
      complaint,
    });
  } catch (error) {
    console.error('[ComplaintController] submitComplaint error:', error);
    return res.status(500).json({ error: 'Failed to submit complaint' });
  }
}

/**
 * Get complaints with optional filtering
 * Route: GET /complaints
 */
export async function getComplaints(req, res) {
  try {
    const { email, status, category, priority } = req.query;
    const filter = {};

    if (email) filter.user_email = email.toLowerCase().trim();
    if (status) filter.status = new RegExp(status, 'i');
    if (priority) filter.priority = new RegExp(priority, 'i');
    if (category) filter.category = new RegExp(category, 'i');

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error('[ComplaintController] getComplaints error:', error);
    return res.status(500).json({ error: 'Database read failed' });
  }
}

/**
 * Get single complaint by ID (supports complaintId, incident_id, or Mongo _id)
 * Route: GET /complaints/:id
 */
export async function getComplaintById(req, res) {
  try {
    const id = req.params.id;
    const email = (req.query.email || '').trim().toLowerCase();
    if (!id) return res.status(400).json({ error: 'Missing complaint ID' });

    if (!email) return res.status(400).json({ error: 'Email is required to track a complaint' });

    let complaint = await Complaint.findOne({ complaintId: id, user_email: email });

    if (!complaint) {
      complaint = await Complaint.findOne({ incident_id: id, user_email: email });
    }

    if (!complaint && id.match(/^[0-9a-fA-F]{24}$/)) {
      complaint = await Complaint.findOne({ _id: id, user_email: email });
    }

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    console.error('[ComplaintController] getComplaintById error:', error);
    return res.status(500).json({ error: 'Database read failed' });
  }
}

/**
 * Update complaint status & department (Admin Action)
 * Route: PATCH /complaints/:id/status
 */
export async function updateComplaintStatus(req, res) {
  try {
    const id = req.params.id;
    const { status: newStatus, department: newDepartment, message: customMessage } = req.body || {};

    if (!id) return res.status(400).json({ error: 'Missing complaint ID' });

    let complaint = await Complaint.findOne({ complaintId: id });
    if (!complaint) complaint = await Complaint.findOne({ incident_id: id });
    if (!complaint && id.match(/^[0-9a-fA-F]{24}$/)) complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint record not found' });
    }

    if (newStatus) {
      complaint.status = newStatus;
      if (['resolved', 'closed', 'Resolved', 'Closed'].includes(newStatus)) {
        complaint.resolvedAt = new Date();
      }
    }

    if (newDepartment) {
      complaint.department = newDepartment;
    }

    const logMessage = customMessage || `Status updated to ${newStatus || complaint.status}${newDepartment ? ` & assigned to ${newDepartment}` : ''}`;

    complaint.history.push({
      status: newStatus || complaint.status,
      message: logMessage,
      updatedBy: req.user?.role || 'Admin',
      timestamp: new Date(),
    });

    await complaint.save();

    await sendStatusUpdateEmail({
      recipient: complaint.user_email,
      complaintId: complaint.complaintId,
      status: complaint.status,
      department: complaint.department,
      message: logMessage,
    });

    return res.status(200).json({
      success: true,
      message: `Complaint ${complaint.complaintId} updated successfully`,
      updatedRecord: complaint,
    });
  } catch (error) {
    console.error('[ComplaintController] updateComplaintStatus error:', error);
    return res.status(500).json({ error: 'Failed to update complaint status' });
  }
}
