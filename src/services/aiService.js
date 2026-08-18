import { GoogleGenAI } from "@google/genai";

let aiClient = null;

function getAiClient() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI();
    } catch (err) {
      console.warn("[Gemini AI] Initialization warning:", err.message);
    }
  }
  return aiClient;
}

const DEPARTMENT_RULES = {
  pothole: "Roads & Public Works",
  "road damage": "Roads & Public Works",
  garbage: "Sanitation Department",
  waste: "Sanitation Department",
  streetlight: "Electrical Department",
  lighting: "Electrical Department",
  "water leakage": "Water Supply Department",
  water: "Water Supply Department",
  drainage: "Drainage & Public Works Department",
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
export async function analyzeCivicComplaint({
  userDescription,
  imageBuffer = null,
  mimeType = "image/jpeg",
  rawLocation = "",
}) {
  const ai = getAiClient();

  if (!ai || !process.env.GEMINI_API_KEY) {
    console.warn(
      "[Gemini AI] GEMINI_API_KEY not set. Running intelligent local Action Engine fallback.",
    );
    return fallbackAnalysis(userDescription, rawLocation);
  }

  try {
    const promptText = `
You are CivicFlow AI, a highly accurate civic issue classification and authority-routing system.

Your job is to analyze TWO sources of evidence:

1. The uploaded IMAGE
2. The citizen's TEXT DESCRIPTION

Your objective is NOT merely to recognize objects.

Your objective is to determine:

1. WHAT civic problem is actually present
2. WHAT category best describes that problem
3. WHICH AUTHORITY DEPARTMENT is most responsible for resolving it
4. HOW URGENT the problem is
5. HOW CONFIDENTLY the evidence supports the decision

==================================================
CORE CLASSIFICATION PRINCIPLE
==================================================

SEPARATE THESE TWO QUESTIONS:

QUESTION 1:
"What is physically wrong?"

QUESTION 2:
"Which department is responsible for fixing it?"

NEVER classify the department merely from a keyword.

For example:

"Water is everywhere because a drain is blocked."

The problem is NOT automatically Water Leakage.

The correct reasoning is:

Blocked drainage
-> Drainage-related infrastructure problem
-> Responsible authority based on the configured department mapping

Similarly:

"Road is wet."

This does NOT automatically mean Water Leakage.

The system must identify the physical cause visible in the image.

==================================================
EVIDENCE PRIORITY
==================================================

Use the following evidence hierarchy:

1. CLEAR PHYSICAL EVIDENCE IN IMAGE
2. EXPLICIT INFORMATION IN CITIZEN DESCRIPTION
3. CONTEXTUAL CLUES
4. GENERAL ASSUMPTIONS

Never allow a weak textual clue to override strong visual evidence.

If the image and description disagree:

- Prefer the image when the physical evidence is clear.
- Use the description to interpret context.
- If the image is ambiguous, use the description as supporting evidence.
- If neither provides enough evidence, lower confidence and classify conservatively.

==================================================
ALLOWED ISSUE CATEGORIES
==================================================

You MUST choose EXACTLY ONE:

- Pothole
- Garbage
- Streetlight
- Water Leakage
- Drainage
- Road Damage
- Park/Recreation Issue
- Public Safety Hazard
- Other

Do NOT invent new categories.

==================================================
CATEGORY DEFINITIONS
==================================================

POTHOLE:

A distinct hole, cavity, depression, or localized collapse in a road surface.

Examples:
- Large hole in asphalt
- Circular/deep road depression
- Broken road section forming a cavity
- Pothole filled with rainwater

IMPORTANT:

If a distinct pothole is visible, classify it as Pothole even if the surrounding road is generally damaged.

--------------------------------------------------

ROAD DAMAGE:

General deterioration of a road where a distinct pothole is NOT the primary issue.

Examples:
- Cracks
- Broken pavement
- Uneven road surface
- Worn-out asphalt
- Large damaged road section
- Surface deterioration

If the problem contains a clearly identifiable pothole:

-> Pothole takes priority.

--------------------------------------------------

GARBAGE:

Visible solid waste or improper waste disposal.

Examples:
- Garbage pile
- Trash
- Litter
- Dumped waste
- Garbage bags
- Overflowing garbage bin
- Waste accumulation

Do NOT classify ordinary dirt, mud, standing water, or road debris as Garbage unless there is clear evidence of waste.

--------------------------------------------------

STREETLIGHT:

A physical problem involving a streetlight or public lighting infrastructure.

Examples:
- Broken streetlight
- Fallen streetlight pole
- Damaged lamp
- Missing lamp
- Exposed/damaged streetlight fixture
- Streetlight that is explicitly reported as non-functional when no physical damage is visible

IMPORTANT:

Darkness alone is NOT enough to classify Streetlight.

There must be evidence connecting the problem to public lighting.

--------------------------------------------------

WATER LEAKAGE:

Uncontrolled water escaping from water-supply infrastructure.

Examples:
- Broken water pipe
- Burst pipeline
- Water spraying from pipe
- Visible leak from water infrastructure
- Broken water valve releasing water

IMPORTANT:

Water on the ground alone does NOT prove Water Leakage.

Examples:

Pothole containing water
-> Pothole

Rainwater on road
-> Drainage or Road Damage depending on evidence

Flooded road with blocked drain
-> Drainage

Broken pipe visibly releasing water
-> Water Leakage

--------------------------------------------------

DRAINAGE:

A problem involving drainage, stormwater, sewage, or water-flow infrastructure.

Examples:
- Blocked drain
- Overflowing drain
- Damaged drain
- Open/broken drainage channel
- Sewage overflow
- Water accumulation clearly caused by blocked drainage
- Drain cover missing or damaged

IMPORTANT:

Standing water alone does NOT automatically mean Drainage.

The system must look for evidence of drainage infrastructure or drainage failure.

--------------------------------------------------

PARK / RECREATION ISSUE:

A civic issue primarily involving public parks, recreation areas, playgrounds, or related infrastructure.

Examples:
- Broken playground equipment
- Damaged park bench
- Damaged public recreational equipment
- Broken park fencing
- Damaged park infrastructure
- Unsafe public recreation equipment

Location matters here.

A broken bench inside a public park:

-> Park/Recreation Issue

A broken bench outside a park:

-> Other or Public Safety Hazard depending on evidence.

--------------------------------------------------

PUBLIC SAFETY HAZARD:

Use when the primary problem creates an immediate or significant public safety risk that does not fit better into another infrastructure category.

Examples:
- Exposed dangerous infrastructure
- Fallen hazardous object obstructing public movement
- Exposed electrical hazard
- Dangerous structural obstruction
- Immediate hazard to pedestrians
- Serious unsafe public infrastructure

IMPORTANT:

Do NOT use Public Safety Hazard simply because another civic problem is dangerous.

For example:

Large pothole
-> Pothole

Broken streetlight
-> Streetlight

Garbage pile
-> Garbage

Public Safety Hazard is reserved for situations where the safety hazard itself is the primary classification or where no more specific category exists.

--------------------------------------------------

OTHER:

Use ONLY when the problem clearly exists but does not reasonably fit any available category.

Do NOT use Other merely because the image is slightly difficult.

==================================================
CATEGORY PRIORITY RULES
==================================================

When multiple problems appear in the same image:

Identify the PRIMARY issue.

The primary issue is the one that:

1. Is most clearly visible
2. Represents the main complaint
3. Requires the most relevant civic intervention
4. Has the greatest direct public impact

Examples:

Large pothole + water inside pothole
-> Pothole

Garbage dumped beside a damaged road
-> Garbage if garbage is the dominant issue

Blocked drain + standing water
-> Drainage

Broken streetlight + dark road
-> Streetlight

Damaged park equipment + garbage nearby
-> Park/Recreation Issue if damaged equipment is the main problem

==================================================
AUTHORITY DEPARTMENTS
==================================================

The uploaded reference interface establishes EXACTLY these authority departments:

- Roads & Public Works
- Sanitation
- Utilities
- Parks & Rec
- Public Safety

The department output MUST use one of these EXACT names.

NEVER invent another department name.

Examples such as "Electrical Department", "Water Supply Department", "Drainage Department", etc. MUST NOT be returned as department names.

==================================================
DEPARTMENT ROUTING LOGIC
==================================================

POTHOLE
-> Roads & Public Works

ROAD DAMAGE
-> Roads & Public Works

GARBAGE
-> Sanitation

STREETLIGHT
-> Utilities

WATER LEAKAGE
-> Utilities

DRAINAGE
-> Roads & Public Works

PARK / RECREATION ISSUE
-> Parks & Rec

PUBLIC SAFETY HAZARD
-> Public Safety

OTHER
-> Determine the most appropriate department from the physical evidence and context.

If no reasonable department can be determined:

-> Public Safety

This is a fallback only.

==================================================
DEPARTMENT ROUTING PRINCIPLE
==================================================

The department must correspond to the ROOT CIVIC PROBLEM.

Do NOT route based on:

- The location alone
- A random keyword
- The citizen's emotional description
- The severity alone

Route based on the infrastructure or civic service that actually requires intervention.

Examples:

"Water is covering the road because the drain is blocked."

Category:
Drainage

Department:
Roads & Public Works

NOT:

Water Leakage
Utilities

--------------------------------------------------

"Road is flooded because a water pipeline has burst."

Category:
Water Leakage

Department:
Utilities

NOT:

Drainage
Roads & Public Works

--------------------------------------------------

"There is a pile of garbage near a park."

Category:
Garbage

Department:
Sanitation

NOT:

Parks & Rec

The location does not override the underlying civic problem.

--------------------------------------------------

"Children's playground slide is broken."

Category:
Park/Recreation Issue

Department:
Parks & Rec

--------------------------------------------------

"An exposed electrical wire is hanging dangerously over the sidewalk."

Category:
Public Safety Hazard

Department:
Public Safety

==================================================
IMAGE ANALYSIS PROTOCOL
==================================================

Before classification, internally perform the following analysis:

STEP 1:
Determine whether the image actually contains a civic issue.

STEP 2:
Identify the primary physical object or infrastructure involved.

STEP 3:
Identify the visible failure, damage, obstruction, leakage, accumulation, or hazard.

STEP 4:
Determine the most specific issue category.

STEP 5:
Determine the authority responsible for that issue.

STEP 6:
Use the citizen description to confirm or refine the interpretation.

STEP 7:
Determine severity and urgency.

STEP 8:
Assign confidence based ONLY on available evidence.

Do NOT reveal this internal reasoning process in the final response.

==================================================
IMAGE QUALITY CHECK
==================================================

Before classification, assess whether the image provides sufficient evidence.

Consider:

- Blur
- Darkness
- Obstruction
- Distance
- Cropping
- Poor visibility
- Ambiguous objects
- Multiple unrelated objects

If the image does not clearly show the problem:

DO NOT pretend certainty.

Use the citizen description as supporting evidence and reduce confidence appropriately.

If neither image nor description provides enough evidence:

category:
Other

confidence:
50-60

reason:
Insufficient visual or textual evidence to reliably identify the civic issue.

==================================================
PRIORITY CLASSIFICATION
==================================================

Determine priority using:

- Immediate safety risk
- Severity
- Public exposure
- Traffic obstruction
- Pedestrian risk
- Accident potential
- Environmental/health risk
- Scale of affected area
- Urgency of intervention

Choose EXACTLY ONE:

critical
high
medium
low

--------------------------------------------------

CRITICAL:

Immediate or potentially severe threat to life, major public safety hazard, severe infrastructure failure, exposed dangerous electrical infrastructure, major obstruction, or severe flooding affecting public movement.

--------------------------------------------------

HIGH:

Significant pothole, dangerous road damage, major water leakage, serious drainage overflow, major public infrastructure damage, or substantial safety risk.

--------------------------------------------------

MEDIUM:

Moderate garbage accumulation, damaged streetlight, moderate road deterioration, localized leakage, or moderate civic disruption.

--------------------------------------------------

LOW:

Minor damage, cosmetic deterioration, small localized issue, or low-impact problem with limited public consequences.

IMPORTANT:

Do NOT automatically assign HIGH or CRITICAL simply because the citizen describes the problem dramatically.

Priority must be based on evidence.

==================================================
CONFIDENCE
==================================================

Return an integer from 50 to 99.

Confidence represents how strongly the available evidence supports the classification.

90-99:
Very clear visual evidence with little ambiguity.

80-89:
Clear evidence with minor uncertainty.

70-79:
Reasonably supported but some ambiguity exists.

60-69:
Weak or partially supported evidence.

50-59:
Highly uncertain classification.

NEVER use 95+ confidence when:

- Image is blurry
- Problem is partially hidden
- Multiple interpretations are equally plausible
- Classification depends mainly on an unsupported assumption

==================================================
LOCATION
==================================================

Use the provided location only as contextual information.

NEVER invent a location.

If unavailable:

"Unknown Location"

==================================================
REASON
==================================================

Provide a concise evidence-based explanation.

The reason MUST explain:

1. What is visible
2. Why that supports the chosen category
3. Why the selected authority is appropriate when necessary

Do NOT mention unsupported assumptions.

GOOD:

"The image shows a distinct depression forming a cavity in the road surface, which is characteristic of a pothole. This falls under Roads & Public Works."

BAD:

"There is probably a damaged water pipe underneath the road."

Do not speculate about invisible infrastructure.

==================================================
SUMMARY
==================================================

Create a concise 8-15 word summary.

The summary must describe the actual civic problem.

GOOD:

"Large pothole creating a significant road safety risk for passing vehicles"

BAD:

"Road infrastructure issue requiring immediate government attention"

The summary should be specific, not generic.

==================================================
CONFLICT RESOLUTION
==================================================

If the image and text disagree:

CASE 1:
Image clearly shows one issue, text describes another.

-> Prefer image evidence.

CASE 2:
Image is ambiguous, text clearly describes the issue.

-> Use text as supporting evidence.

CASE 3:
Image and text describe different but related issues.

-> Identify the PRIMARY physical issue.

CASE 4:
Neither provides enough evidence.

-> Use Other and lower confidence.

NEVER force certainty.

==================================================
MULTIPLE-ISSUE HANDLING
==================================================

If multiple civic problems are visible:

Do NOT return multiple categories.

Choose EXACTLY ONE primary category.

Select the issue that:

- is most prominent
- is most clearly evidenced
- is most actionable
- represents the primary civic failure

==================================================
ANTI-KEYWORD BIAS
==================================================

NEVER classify based solely on words such as:

- water
- road
- garbage
- dark
- broken
- leak
- dirty
- unsafe
- drain

The physical context matters more than individual keywords.

Example:

Text:
"There is water here."

Image:
Large pothole filled with water.

Correct:
Pothole

NOT:
Water Leakage

==================================================
ANTI-ASSUMPTION RULE
==================================================

Never assume:

- hidden pipes are broken
- rain caused flooding
- a streetlight is non-functional because the road is dark
- garbage caused drainage blockage
- a road is unsafe simply because someone says it is
- a particular authority owns infrastructure without evidence or configured routing rules

Only classify what the evidence supports.

==================================================
DEPARTMENT CONSISTENCY CHECK
==================================================

Before final output, verify:

Does the selected department match the selected category?

Valid mappings:

Pothole -> Roads & Public Works
Road Damage -> Roads & Public Works
Garbage -> Sanitation
Streetlight -> Utilities
Water Leakage -> Utilities
Drainage -> Roads & Public Works
Park/Recreation Issue -> Parks & Rec
Public Safety Hazard -> Public Safety

If the mapping is inconsistent:

CORRECT IT BEFORE RETURNING THE RESPONSE.

==================================================
FINAL VALIDATION
==================================================

Before producing the final response, internally verify:

[ ] Exactly one category selected
[ ] Category is from the allowed list
[ ] Exactly one department selected
[ ] Department is from the allowed department list
[ ] Category and department are logically consistent
[ ] Image evidence was considered first
[ ] Citizen description was considered
[ ] No keyword-only classification occurred
[ ] No unsupported assumptions were made
[ ] Priority is evidence-based
[ ] Confidence reflects actual certainty
[ ] Location was not invented
[ ] Reason is grounded in visible evidence
[ ] Summary is 8-15 words
[ ] JSON is valid
[ ] No extra text exists outside JSON

==================================================
CITIZEN DESCRIPTION
==================================================

${userDescription || "No description provided."}

==================================================
LOCATION CONTEXT
==================================================

${rawLocation || "Unknown Location"}

==================================================
FINAL RESPONSE
==================================================

Return ONLY valid JSON.

Use EXACTLY this structure:

{
  "category": "Pothole",
  "department": "Roads & Public Works",
  "priority": "high",
  "confidence": 95,
  "location": "Unknown Location",
  "reason": "The image clearly shows a distinct cavity in the road surface consistent with a pothole. The issue therefore falls under Roads & Public Works.",
  "summary": "Large pothole creating a significant road safety risk for passing vehicles"
}

IMPORTANT:

The "department" field MUST be included because CivicFlow AI uses it to route the issue to the appropriate authority.

The department MUST be exactly one of:

"Roads & Public Works"
"Sanitation"
"Utilities"
"Parks & Rec"
"Public Safety"

Do NOT return:

- Additional fields
- Markdown
- Code fences
- Explanations outside JSON
- Multiple classifications
- Alternative categories

Return ONLY the JSON object.
`;

    const contents = [promptText];

    if (imageBuffer) {
      const base64Image = imageBuffer.toString("base64");
      contents.push({
        inlineData: {
          data: base64Image,
          mimeType: mimeType || "image/jpeg",
        },
      });
    }

    console.log(
      "[Gemini AI] Dispatching multimodal request to gemini-2.5-flash...",
    );
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = (response.text || "").trim();
    console.log("[Gemini AI] Multimodal Raw Response:", responseText);

    let cleaned = responseText;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned
        .replace(/^```[a-z]*\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
    }

    const result = JSON.parse(cleaned);

    // Validate & normalize fields
    const validCategories = [
      "Pothole",
      "Garbage",
      "Streetlight",
      "Water Leakage",
      "Drainage",
      "Road Damage",
      "Other",
    ];
    let category = result.category || "Pothole";
    if (!validCategories.includes(category)) {
      category = "Pothole";
    }

    const catKey = category.toLowerCase();
    const department =
      result.department || DEPARTMENT_RULES[catKey] || "Roads & Public Works";
    const validPriorities = ["critical", "high", "medium", "low"];
    let priority = (result.priority || "high").toLowerCase();
    if (!validPriorities.includes(priority)) {
      priority = "high";
    }

    return {
      category,
      department,
      priority,
      confidence: Math.min(
        99,
        Math.max(60, parseInt(result.confidence, 10) || 90),
      ),
      location: result.location || rawLocation || "Reported Location",
      reason:
        result.reason ||
        "AI analysis detected civic infrastructure damage requiring municipal intervention.",
      summary:
        result.summary ||
        `${category} issue reported at ${rawLocation || "specified location"}`,
    };
  } catch (error) {
    console.error("[Gemini AI] Multimodal Analysis error:", error.message);
    return fallbackAnalysis(userDescription, rawLocation);
  }
}

/**
 * Deterministic fallback analysis when Gemini API is unavailable or unconfigured
 */
function fallbackAnalysis(description = "", location = "") {
  const desc = (description || "").toLowerCase();

  let category = "Pothole";
  let priority = "high";
  let department = "Roads & Public Works";

  if (
    desc.includes("garbage") ||
    desc.includes("trash") ||
    desc.includes("waste") ||
    desc.includes("litter")
  ) {
    category = "Garbage";
    department = "Sanitation Department";
    priority = "medium";
  } else if (
    desc.includes("light") ||
    desc.includes("dark") ||
    desc.includes("lamp") ||
    desc.includes("street")
  ) {
    category = "Streetlight";
    department = "Electrical Department";
    priority = "medium";
  } else if (
    desc.includes("water") ||
    desc.includes("leak") ||
    desc.includes("pipe") ||
    desc.includes("flood")
  ) {
    category = "Water Leakage";
    department = "Water Supply Department";
    priority = "high";
  } else if (
    desc.includes("drain") ||
    desc.includes("sewage") ||
    desc.includes("overflow")
  ) {
    category = "Drainage";
    department = "Drainage & Public Works Department";
    priority = "critical";
  } else if (
    desc.includes("danger") ||
    desc.includes("accident") ||
    desc.includes("huge") ||
    desc.includes("severe")
  ) {
    priority = "critical";
  }

  return {
    category,
    department,
    priority,
    confidence: 88,
    location: location || "Reported Location",
    reason: `Automated rule engine classified this issue based on keyword severity ("${category}") and user incident details.`,
    summary: `${category} issue reported at ${location || "specified area"}`,
  };
}

// Backward compatibility functions
export async function classifyImageWithGemini(imageBuffer, mimeType) {
  const res = await analyzeCivicComplaint({
    userDescription: "Civic issue image",
    imageBuffer,
    mimeType,
  });
  return {
    category: res.category.toLowerCase(),
    confidence: res.confidence / 100,
  };
}

export async function generateComplaintDescription(
  category,
  severity,
  address,
) {
  const res = await analyzeCivicComplaint({
    userDescription: `${category} at ${address}`,
    rawLocation: address,
  });
  return res.reason;
}
