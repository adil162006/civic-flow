import { Complaint } from '../models/Complaint.js';

/**
 * Get Admin Dashboard Statistics
 * Route: GET /api/admin/stats
 */
export async function getAdminStats(req, res) {
  try {
    const total = await Complaint.countDocuments();

    const pending = await Complaint.countDocuments({
      status: { $in: ['Submitted', 'AI Verified', 'Pending', 'submitted'] },
    });

    const inProgress = await Complaint.countDocuments({
      status: { $in: ['Assigned', 'In Progress', 'assigned', 'in_progress'] },
    });

    const resolved = await Complaint.countDocuments({
      status: { $in: ['Resolved', 'resolved', 'closed'] },
    });

    const highPriority = await Complaint.countDocuments({
      priority: { $in: ['critical', 'high', 'Critical', 'High'] },
    });

    // Priority breakdown
    const critical = await Complaint.countDocuments({ priority: { $regex: /^critical$/i } });
    const high = await Complaint.countDocuments({ priority: { $regex: /^high$/i } });
    const medium = await Complaint.countDocuments({ priority: { $regex: /^medium$/i } });
    const low = await Complaint.countDocuments({ priority: { $regex: /^low$/i } });

    // Category breakdown
    const categories = ['Pothole', 'Garbage', 'Streetlight', 'Water Leakage', 'Drainage', 'Road Damage', 'Other'];
    const categoryDistribution = {};

    for (const cat of categories) {
      categoryDistribution[cat] = await Complaint.countDocuments({
        category: { $regex: new RegExp(`^${cat}$`, 'i') },
      });
    }

    return res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        resolved,
        highPriority,
        priorityOverview: {
          critical,
          high,
          medium,
          low,
        },
        categoryDistribution,
      },
    });
  } catch (error) {
    console.error('[AdminController] getAdminStats error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
}

/**
 * Get Admin Complaints with multi-filter
 * Route: GET /api/admin/complaints
 */
export async function getAdminComplaints(req, res) {
  try {
    const { search, category, priority, status, department, limit = 50 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { complaintId: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') },
        { user_name: new RegExp(search, 'i') },
      ];
    }

    if (category && category !== 'all') {
      filter.category = new RegExp(category, 'i');
    }

    if (priority && priority !== 'all') {
      filter.priority = new RegExp(priority, 'i');
    }

    if (status && status !== 'all') {
      filter.status = new RegExp(status, 'i');
    }

    if (department && department !== 'all') {
      filter.department = new RegExp(department, 'i');
    }

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error) {
    console.error('[AdminController] getAdminComplaints error:', error);
    return res.status(500).json({ error: 'Failed to fetch admin complaints' });
  }
}
