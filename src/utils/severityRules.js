export function calculateSeverity(category, confidence = 0.0) {
  if (!category) return 'Pending Review';

  const cat = category.toLowerCase().trim();

  if (cat === 'unknown') {
    return 'Pending Review';
  }

  if ((cat === 'pothole' || cat === 'road_issue') && confidence > 0.8) {
    return 'High';
  }

  if (cat === 'water') {
    return 'High';
  }

  if (cat === 'garbage' || cat === 'waste') {
    return 'Medium';
  }

  return 'Low';
}
