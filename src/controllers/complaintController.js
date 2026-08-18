import { Complaint } from "../models/Complaint.js";
import {
  sendStatusUpdateEmail,
  sendCitizenComplaintConfirmationEmail,
  sendEmailNotification,
} from "../services/emailService.js";
import { uploadToCloudinary } from "../services/cloudinaryService.js";

/**
 * Submit or Finalize Complaint
 * Route: POST /complaints
 */
export async function submitComplaint(req, res) {
  try {
    const data = req.body || {};
    const complaintId = data.complaintId || data.complaint_id;
    const incident_id = data.incident_id || data.s3Key;
    const userEmail = (
      data.userEmail ||
      data.user_email ||
      "citizen@civicflow.ai"
    )
      .trim()
      .toLowerCase();

    let complaint = null;

    if (complaintId) {
      complaint = await Complaint.findOne({ complaintId });
    } else if (incident_id) {
      complaint = await Complaint.findOne({ incident_id });
    }

    if (!complaint) {
      // Create new complaint
      const count = await Complaint.countDocuments();
      const newId = `CF-2026-${String(count + 1).padStart(4, "0")}`;

      let locAddr = "";
      let locLat = parseFloat(data.latitude) || null;
      let locLon = parseFloat(data.longitude) || null;

      if (data.location && typeof data.location === "object") {
        locAddr = data.location.address || "";
        if (data.location.latitude != null)
          locLat = parseFloat(data.location.latitude);
        if (data.location.longitude != null)
          locLon = parseFloat(data.location.longitude);
      } else if (typeof data.location === "string") {
        try {
          const parsed = JSON.parse(data.location);
          if (parsed && typeof parsed === "object") {
            locAddr = parsed.address || "";
            if (parsed.latitude != null) locLat = parseFloat(parsed.latitude);
            if (parsed.longitude != null) locLon = parseFloat(parsed.longitude);
          } else {
            locAddr = data.location;
          }
        } catch (e) {
          locAddr = data.location;
        }
      }

      if (!locAddr) locAddr = data.address || "Reported Location";

      complaint = new Complaint({
        complaintId: newId,
        description: data.description || data.userNote || "Civic issue report",
        category: data.category || "Pothole",
        department: data.department || "Roads & Public Works",
        priority: data.priority || "high",
        location: {
          address: locAddr,
          latitude: locLat,
          longitude: locLon,
        },
        address: locAddr,
        latitude: locLat,
        longitude: locLon,
        user_name: data.userName || data.user_name || "Citizen",
        user_email: userEmail,
        imageUrl: data.imageUrl || "",
        status: "Submitted",
        history: [
          {
            status: "Submitted",
            message: "Complaint submitted by citizen",
            updatedBy: "Citizen",
            timestamp: new Date(),
          },
        ],
      });
      await complaint.save();

      // Dispatch notifications for new complaint
      if (userEmail) {
        sendCitizenComplaintConfirmationEmail({
          recipient: userEmail,
          complaintId: complaint.complaintId,
          category: complaint.category,
          priority: complaint.priority,
          department: complaint.department,
          description: complaint.description,
          address: complaint.address || "Reported Location",
          status: complaint.status,
        });
      }

      sendEmailNotification({
        incident_id: complaint.complaintId,
        category: complaint.category,
        severity: (complaint.priority || "MEDIUM").toUpperCase(),
        department: complaint.department,
        description: complaint.description,
      });
    } else {
      // Update existing complaint
      if (data.userNote) complaint.user_note = data.userNote;
      if (data.userName) complaint.user_name = data.userName;
      if (userEmail) complaint.user_email = userEmail;
      if (data.latitude) complaint.latitude = parseFloat(data.latitude);
      if (data.longitude) complaint.longitude = parseFloat(data.longitude);
      if (data.address) complaint.address = data.address;
      if (data.location && typeof data.location === "object") {
        complaint.location = {
          address: data.location.address || complaint.address || "",
          latitude:
            parseFloat(data.location.latitude) || complaint.latitude || null,
          longitude:
            parseFloat(data.location.longitude) || complaint.longitude || null,
        };
      }
      if (data.status) complaint.status = data.status;

      complaint.history.push({
        status: "Submitted",
        message: "Complaint details finalized by citizen",
        updatedBy: "Citizen",
        timestamp: new Date(),
      });

      await complaint.save();
    }

    return res.status(200).json({
      success: true,
      complaintId: complaint.complaintId,
      incident_id: complaint.incident_id || complaint.complaintId,
      status: complaint.status,
      estimatedResolution: data.estimatedResolution || "2-3 days",
      complaint,
    });
  } catch (error) {
    console.error("[ComplaintController] submitComplaint error:", error);
    return res.status(500).json({ error: "Failed to submit complaint" });
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
    if (status) filter.status = new RegExp(status, "i");
    if (priority) filter.priority = new RegExp(priority, "i");
    if (category) filter.category = new RegExp(category, "i");

    const complaints = await Complaint.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error("[ComplaintController] getComplaints error:", error);
    return res.status(500).json({ error: "Database read failed" });
  }
}

/**
 * Get single complaint by ID (supports complaintId, incident_id, or Mongo _id)
 * Route: GET /complaints/:id
 */
export async function getComplaintById(req, res) {
  try {
    const id = req.params.id;
    const email = (req.query.email || "").trim().toLowerCase();
    if (!id) return res.status(400).json({ error: "Missing complaint ID" });

    let complaint = await Complaint.findOne({ complaintId: id });

    if (!complaint) {
      complaint = await Complaint.findOne({ incident_id: id });
    }

    if (!complaint && id.match(/^[0-9a-fA-F]{24}$/)) {
      complaint = await Complaint.findById(id);
    }

    if (!complaint && email) {
      complaint = await Complaint.findOne({ user_email: email });
    }

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    console.error("[ComplaintController] getComplaintById error:", error);
    return res.status(500).json({ error: "Database read failed" });
  }
}

/**
 * Update complaint status & department (Admin Action)
 * Route: PATCH /complaints/:id/status
 */
export async function updateComplaintStatus(req, res) {
  try {
    const id = req.params.id;
    const file = req.file;
    const {
      status: newStatus,
      department: newDepartment,
      message: customMessage,
      resolutionNote,
    } = req.body || {};

    if (!id) return res.status(400).json({ error: "Missing complaint ID" });

    let complaint = await Complaint.findOne({ complaintId: id });
    if (!complaint) complaint = await Complaint.findOne({ incident_id: id });
    if (!complaint && id.match(/^[0-9a-fA-F]{24}$/))
      complaint = await Complaint.findById(id);

    if (!complaint) {
      return res.status(404).json({ error: "Complaint record not found" });
    }

    let resolvedImageUrl = req.body?.resolvedImageUrl || "";
    if (file) {
      resolvedImageUrl = `/uploads/${file.filename}`;
      if (file.path) {
        const cloudinaryResult = await uploadToCloudinary(
          file.path,
          "civicflow-resolutions",
        );
        if (cloudinaryResult?.secure_url) {
          resolvedImageUrl = cloudinaryResult.secure_url;
        }
      }
    }

    if (newStatus) {
      complaint.status = newStatus;
      if (["resolved", "closed", "Resolved", "Closed"].includes(newStatus)) {
        complaint.resolvedAt = new Date();
        if (resolvedImageUrl) complaint.resolvedImageUrl = resolvedImageUrl;
        if (resolutionNote) complaint.resolutionNote = resolutionNote;
      }
    }

    if (resolvedImageUrl && !complaint.resolvedImageUrl) {
      complaint.resolvedImageUrl = resolvedImageUrl;
    }
    if (resolutionNote && !complaint.resolutionNote) {
      complaint.resolutionNote = resolutionNote;
    }

    if (newDepartment) {
      complaint.department = newDepartment;
    }

    const logMessage =
      customMessage ||
      ((newStatus === "Resolved" || complaint.status === "Resolved") &&
      resolutionNote
        ? `Issue marked resolved by department: ${resolutionNote}`
        : `Status updated to ${newStatus || complaint.status}${newDepartment ? ` & assigned to ${newDepartment}` : ""}`);

    complaint.history.push({
      status: newStatus || complaint.status,
      message: logMessage,
      imageUrl: resolvedImageUrl || "",
      updatedBy: req.user?.role || "Admin",
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
      complaint,
    });
  } catch (error) {
    console.error("[ComplaintController] updateComplaintStatus error:", error);
    return res.status(500).json({ error: "Failed to update complaint status" });
  }
}
