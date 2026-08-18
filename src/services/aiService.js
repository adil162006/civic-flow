import { GoogleGenAI } from '@google/genai';

let aiClient = null;

function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI();
    } catch (err) {
      console.warn('[Gemini AI] Initialization warning:', err.message);
    }
  }
  return aiClient;
}

const DEPARTMENT_RULES = {
  pothole: 'Roads & Public Works',
  'road damage': 'Roads & Public Works',
  garbage: 'Sanitation Department',
  waste: 'Sanitation Department',
  streetlight: 'Electrical Department',
  lighting: 'Electrical Department',
  'water leakage': 'Water Supply Department',
  water: 'Water Supply Department',
  drainage: 'Drainage & Public Works Department',
};

/**
 * Multimodal AI Action Engine using Gemini 2.5 Flash.
 * Analyzes Complaint Text + Uploaded Image together.
 *
 * @param {string} userDescription - Text description provided by citizen
 * @param {Buffer|null} imageBuffer - Buffer of the image file (if uploaded)
 * @param {string} mimeType - Image MIME type (e.g. 'image/jpeg')
 * @param {string} rawLocation - Location string or coordinates
 * @returns {Promise<{
 *   category: string,
 *   department: string,
 *   priority: string,
 *   confidence: number,
 *   location: string,
 *   reason: string,
 *   summary: string
 * }>}
 */
export async function analyzeCivicComplaint({ userDescription, imageBuffer = null, mimeType = 'image/jpeg', rawLocation = '' }) {
  const ai = getAiClient();

  if (!ai || !process.env.GEMINI_API_KEY) {
    console.warn('[Gemini AI] GEMINI_API_KEY not set. Running intelligent local Action Engine fallback.');
    return fallbackAnalysis(userDescription, rawLocation);
  }

  try {
    const promptText = `
You are the CivicFlow AI Action Engine — an intelligent municipal infrastructure analysis system.
Analyze the citizen's complaint description AND the uploaded image together.

Citizen Description: "${userDescription || 'No description provided.'}"
Raw Location Context: "${rawLocation || 'Unknown location'}"

Your task is to identify:
1. "category": Choose EXACTLY ONE from: ["Pothole", "Garbage", "Streetlight", "Water Leakage", "Drainage", "Road Damage", "Other"]
2. "department": Responsible municipal department.
   - Pothole / Road Damage -> "Roads & Public Works"
   - Garbage -> "Sanitation Department"
   - Streetlight -> "Electrical Department"
   - Water Leakage -> "Water Supply Department"
   - Drainage -> "Drainage & Public Works Department"
3. "priority": Severity rating based on safety hazard, public impact, and urgency. Choose EXACTLY ONE from: ["critical", "high", "medium", "low"]
4. "confidence": Integer percentage from 50 to 99 representing your confidence score.
5. "location": Extracted specific location name or landmark.
6. "reason": Concise, clear technical justification explaining WHY this priority and department were assigned (2-3 sentences).
7. "summary": One-line short complaint summary (8-12 words).

Respond ONLY with a valid JSON object matching this exact structure:
{
  "category": "Pothole",
  "department": "Roads & Public Works",
  "priority": "high",
  "confidence": 94,
  "location": "College Main Gate",
  "reason": "The image reveals significant road surface fracturing, and the user description indicates an active safety risk for commuter vehicles.",
  "summary": "Large pothole causing vehicle hazards near college entrance"
}
`;

    const contents = [promptText];

    if (imageBuffer) {
      const base64Image = imageBuffer.toString('base64');
      contents.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType || 'image/jpeg',
        },
      });
    }

    console.log('[Gemini AI] Dispatching multimodal request to gemini-2.5-flash...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
    });

    const responseText = (response.text || '').trim();
    console.log('[Gemini AI] Multimodal Raw Response:', responseText);

    let cleaned = responseText;
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    const result = JSON.parse(cleaned);

    // Validate & normalize fields
    const validCategories = ['Pothole', 'Garbage', 'Streetlight', 'Water Leakage', 'Drainage', 'Road Damage', 'Other'];
    let category = result.category || 'Pothole';
    if (!validCategories.includes(category)) {
      category = 'Pothole';
    }

    const catKey = category.toLowerCase();
    const department = result.department || DEPARTMENT_RULES[catKey] || 'Roads & Public Works';
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    let priority = (result.priority || 'high').toLowerCase();
    if (!validPriorities.includes(priority)) {
      priority = 'high';
    }

    return {
      category,
      department,
      priority,
      confidence: Math.min(99, Math.max(60, parseInt(result.confidence, 10) || 90)),
      location: result.location || rawLocation || 'Reported Location',
      reason: result.reason || 'AI analysis detected civic infrastructure damage requiring municipal intervention.',
      summary: result.summary || `${category} issue reported at ${rawLocation || 'specified location'}`,
    };
  } catch (error) {
    console.error('[Gemini AI] Multimodal Analysis error:', error.message);
    return fallbackAnalysis(userDescription, rawLocation);
  }
}

/**
 * Deterministic fallback analysis when Gemini API is unavailable or unconfigured
 */
function fallbackAnalysis(description = '', location = '') {
  const desc = (description || '').toLowerCase();

  let category = 'Pothole';
  let priority = 'high';
  let department = 'Roads & Public Works';

  if (desc.includes('garbage') || desc.includes('trash') || desc.includes('waste') || desc.includes('litter')) {
    category = 'Garbage';
    department = 'Sanitation Department';
    priority = 'medium';
  } else if (desc.includes('light') || desc.includes('dark') || desc.includes('lamp') || desc.includes('street')) {
    category = 'Streetlight';
    department = 'Electrical Department';
    priority = 'medium';
  } else if (desc.includes('water') || desc.includes('leak') || desc.includes('pipe') || desc.includes('flood')) {
    category = 'Water Leakage';
    department = 'Water Supply Department';
    priority = 'high';
  } else if (desc.includes('drain') || desc.includes('sewage') || desc.includes('overflow')) {
    category = 'Drainage';
    department = 'Drainage & Public Works Department';
    priority = 'critical';
  } else if (desc.includes('danger') || desc.includes('accident') || desc.includes('huge') || desc.includes('severe')) {
    priority = 'critical';
  }

  return {
    category,
    department,
    priority,
    confidence: 88,
    location: location || 'Reported Location',
    reason: `Automated rule engine classified this issue based on keyword severity ("${category}") and user incident details.`,
    summary: `${category} issue reported at ${location || 'specified area'}`,
  };
}

// Backward compatibility functions
export async function classifyImageWithGemini(imageBuffer, mimeType) {
  const res = await analyzeCivicComplaint({ userDescription: 'Civic issue image', imageBuffer, mimeType });
  return { category: res.category.toLowerCase(), confidence: res.confidence / 100 };
}

export async function generateComplaintDescription(category, severity, address) {
  const res = await analyzeCivicComplaint({ userDescription: `${category} at ${address}`, rawLocation: address });
  return res.reason;
}
