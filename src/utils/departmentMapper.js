const DEPARTMENT_MAP = {
  pothole: 'Road Department',
  road_issue: 'Road Department',
  garbage: 'Sanitation',
  waste: 'Sanitation',
  water: 'Water Board',
  streetlight: 'Electrical Department',
  lighting: 'Electrical Department',
};

const DEFAULT_DEPARTMENT = 'General Department';

export function getDepartment(category) {
  if (!category) return DEFAULT_DEPARTMENT;
  const cat = category.toLowerCase().trim();
  return DEPARTMENT_MAP[cat] || DEFAULT_DEPARTMENT;
}
