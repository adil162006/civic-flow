import { Complaint } from '../models/Complaint.js';

const SEVERITY_SCORES = {
  high: 40,
  medium: 25,
  low: 10,
  'pending review': 5,
};

const CATEGORY_SCORES = {
  pothole: 20,
  road_issue: 20,
  water: 25,
  garbage: 15,
  waste: 15,
  streetlight: 18,
  lighting: 18,
};

const DEFAULT_CATEGORY_SCORE = 10;
const NEARBY_THRESHOLD_DEG = 0.01; // ~1km
const DUPLICATE_BOOST_PER_MATCH = 5;
const MAX_DUPLICATE_BOOST = 20;

export async function calculatePriority({ category, severity, confidence, latitude, longitude }) {
  let score = 0;
  const cat = (category || '').toLowerCase().trim();
  const sev = (severity || '').toLowerCase().trim();

  // 1. Severity Score
  score += SEVERITY_SCORES[sev] || 5;

  // 2. Category Risk Score
  score += CATEGORY_SCORES[cat] || DEFAULT_CATEGORY_SCORE;

  // 3. Confidence Score
  const confScore = Math.floor(Math.min(confidence || 0, 1.0) * 15);
  score += confScore;

  // 4. Duplicate Boost (Geospatial scan if lat/lng available)
  let duplicateCount = 0;
  if (latitude && longitude) {
    try {
      duplicateCount = await Complaint.countDocuments({
        category: cat,
        latitude: { $gte: latitude - NEARBY_THRESHOLD_DEG, $lte: latitude + NEARBY_THRESHOLD_DEG },
        longitude: { $gte: longitude - NEARBY_THRESHOLD_DEG, $lte: longitude + NEARBY_THRESHOLD_DEG },
      });
    } catch (err) {
      console.warn('[PriorityCalculator] Geospatial duplicate scan error:', err.message);
    }
  }

  const boost = Math.min(duplicateCount * DUPLICATE_BOOST_PER_MATCH, MAX_DUPLICATE_BOOST);
  score += boost;

  // Clamp score between 0 and 100
  return Math.max(0, Math.min(100, score));
}
