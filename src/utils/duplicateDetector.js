import { Complaint } from "../models/Complaint.js";

const NEARBY_THRESHOLD_DEG = 0.01; // ~1km radius

/**
 * Scan database for similar existing complaints (Smart Duplicate Detection).
 *
 * @param {Object} params
 * @param {string} params.category - Complaint category
 * @param {number|null} params.latitude - Latitude
 * @param {number|null} params.longitude - Longitude
 * @param {string} params.location - Location string
 * @returns {Promise<{
 *   isDuplicate: boolean,
 *   possibleDuplicate: Object|null,
 *   message: string
 * }>}
 */
export async function checkForDuplicateComplaint({
  category,
  latitude = null,
  longitude = null,
  location = "",
}) {
  try {
    const filter = {
      status: { $ne: "Resolved" },
    };

    if (category) {
      filter.category = new RegExp(category, "i");
    }

    if (latitude && longitude) {
      filter.latitude = {
        $gte: latitude - NEARBY_THRESHOLD_DEG,
        $lte: latitude + NEARBY_THRESHOLD_DEG,
      };
      filter.longitude = {
        $gte: longitude - NEARBY_THRESHOLD_DEG,
        $lte: longitude + NEARBY_THRESHOLD_DEG,
      };
    } else if (location && location.trim().length > 3) {
      filter.location = new RegExp(location.trim(), "i");
    } else {
      return {
        isDuplicate: false,
        possibleDuplicate: null,
        message: "No duplicate found.",
      };
    }

    const existing = await Complaint.findOne(filter).sort({ createdAt: -1 });

    if (existing) {
      return {
        isDuplicate: true,
        possibleDuplicate: existing,
        message:
          "This issue may already have been reported by another citizen.",
      };
    }

    return {
      isDuplicate: false,
      possibleDuplicate: null,
      message: "No duplicate found.",
    };
  } catch (error) {
    console.warn("[DuplicateDetector] Scan warning:", error.message);
    return {
      isDuplicate: false,
      possibleDuplicate: null,
      message: "No duplicate found.",
    };
  }
}
