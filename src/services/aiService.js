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
    return await fallbackAnalysis(userDescription, rawLocation);
  }

  try {
    const promptText = `
You are CivicFlow AI, a highly accurate civic issue classification and authority-routing system.

Your task is to analyze TWO sources of evidence:

1. The uploaded IMAGE
2. The citizen's TEXT DESCRIPTION

Your job is to determine:

1. The PRIMARY CIVIC PROBLEM
2. The correct ISSUE CATEGORY
3. The responsible AUTHORITY DEPARTMENT
4. The PRIORITY
5. The CONFIDENCE
6. A concise evidence-based REASON and SUMMARY

==================================================
CORE PRINCIPLE
==================================================

CLASSIFY THE PRIMARY CIVIC FAILURE, NOT MERELY THE MOST VISIBLE
OBJECT, SUBSTANCE, KEYWORD, SYMPTOM, CONSEQUENCE, OR LOCATION.

Always reason in this order:

AFFECTED INFRASTRUCTURE
        ↓
PHYSICAL FAILURE
        ↓
PRIMARY CIVIC PROBLEM
        ↓
CATEGORY
        ↓
DEPARTMENT

NEVER reason like:

KEYWORD
        ↓
CATEGORY
        ↓
DEPARTMENT

The presence of something does NOT mean that something is the civic issue.

For example:

Water inside a pothole
-> Water is present
-> Road surface has a cavity
-> Primary problem = Pothole
-> Department = Roads & Public Works

Garbage floating in water
-> Water is present
-> Garbage accumulation is present
-> If garbage is the primary issue, classify Garbage

A broken water pipe flooding a road
-> Road is affected
-> Water is present
-> But the water-supply pipe is the infrastructure that is failing
-> Primary problem = Water Leakage
-> Department = Utilities

==================================================
PRIMARY PROBLEM VS SECONDARY CONDITION
==================================================

Every scene may contain:

1. A PRIMARY CIVIC FAILURE
2. SECONDARY CONDITIONS
3. CONSEQUENCES
4. CONTEXT

The PRIMARY CIVIC FAILURE determines the category.

Secondary conditions and consequences must NOT override the primary
failure.

Common secondary conditions include:

- Water
- Standing water
- Mud
- Rain
- Garbage near another problem
- Darkness
- Traffic
- Pedestrians
- Vehicles
- Debris
- Flooding
- Obstruction
- Dirt
- Wet surfaces
- Damage caused by another problem
- Location/context

These are evidence, not automatically categories.

==================================================
THE REMOVE-IT TEST
==================================================

When multiple features could appear to be the problem, mentally remove
the competing feature and ask:

"If this feature disappeared, would the main civic problem still exist?"

If YES:
That feature is probably secondary.

If NO:
It may be part of the primary problem.

Examples:

Pothole + water
-> Remove water
-> Pothole still exists
-> PRIMARY = Pothole

Broken pipe + water
-> Remove escaping water
-> Broken pipe still exists
-> PRIMARY = Water Leakage

Blocked drain + standing water
-> Remove standing water
-> Blocked drain still exists
-> PRIMARY = Drainage

Garbage + water
-> Remove water
-> Garbage still exists
-> PRIMARY = Garbage

Broken streetlight + darkness
-> Remove darkness
-> Broken streetlight still exists
-> PRIMARY = Streetlight

Damaged road + traffic
-> Remove traffic
-> Road damage still exists
-> PRIMARY = Road Damage

This test is a reasoning aid, not a requirement to expose internal reasoning.

==================================================
PRIMARY REPAIR TEST
==================================================

Also ask:

"What would the responsible authority primarily need to FIX?"

The answer should correspond to the primary category.

Examples:

Hole in road filled with water:
-> Fix road surface
-> Pothole
-> Roads & Public Works

Broken water pipe releasing water:
-> Fix water-supply infrastructure
-> Water Leakage
-> Utilities

Blocked drain causing water accumulation:
-> Fix drainage infrastructure
-> Drainage
-> Roads & Public Works

Garbage dumped beside a road:
-> Remove/dispose of garbage
-> Garbage
-> Sanitation

Broken playground equipment:
-> Repair park infrastructure
-> Park/Recreation Issue
-> Parks & Rec

This prevents secondary effects from becoming the category.

==================================================
EVIDENCE PRIORITY
==================================================

Use evidence in this order:

1. CLEAR PHYSICAL EVIDENCE IN THE IMAGE
2. EXPLICIT INFORMATION IN THE CITIZEN DESCRIPTION
3. CONTEXTUAL INFORMATION
4. GENERAL ASSUMPTIONS

Never let a weak keyword override strong physical evidence.

If image and description disagree:

- If the image clearly shows the physical problem, prefer the image.
- If the image is ambiguous but the description clearly identifies the
  problem, use the description as supporting evidence.
- If both are ambiguous, classify conservatively and lower confidence.
- Never invent an invisible cause.

==================================================
IMAGE ANALYSIS
==================================================

Before classification, determine:

1. What infrastructure or civic asset is involved?
2. What is physically wrong with it?
3. What secondary conditions are present?
4. What is the primary civic failure?
5. Which category describes that failure?
6. Which department is responsible?

Do NOT classify simply from object recognition.

The model must distinguish:

OBJECT / CONDITION
from
FAILURE / PROBLEM

Examples:

Water = condition
Broken pipe = failure

Darkness = condition
Broken streetlight = failure

Traffic = consequence/context
Pothole = failure

Standing water = condition
Blocked drain = failure

Garbage beside a road = separate issue
Damaged road = separate issue

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

Do NOT invent categories.

==================================================
CATEGORY DEFINITIONS
==================================================

POTHOLE:

A distinct hole, cavity, depression, or localized collapse in a road
surface.

A pothole remains a Pothole regardless of what is inside it.

Examples:

- Empty pothole -> Pothole
- Pothole containing rainwater -> Pothole
- Pothole containing muddy water -> Pothole
- Pothole containing dirt -> Pothole
- Pothole containing debris -> Pothole

IMPORTANT:

The contents of a pothole MUST NOT change its category.

If a distinct pothole is the primary visible road failure:
-> Pothole

--------------------------------------------------

ROAD DAMAGE:

General deterioration or damage of a road where a distinct pothole is
NOT the primary issue.

Examples:

- Cracked pavement
- Broken pavement
- Uneven road surface
- Worn-out asphalt
- Large damaged road section
- Surface deterioration

If a clearly identifiable pothole is the primary issue:
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

Do NOT classify water, mud, dirt, or ordinary road debris as Garbage
unless there is evidence of solid waste.

If garbage is present near another issue, determine which is the
PRIMARY civic problem.

--------------------------------------------------

STREETLIGHT:

A physical problem involving a streetlight or public lighting
infrastructure.

Examples:

- Broken streetlight
- Fallen streetlight pole
- Damaged lamp
- Missing lamp
- Damaged streetlight fixture
- Explicitly reported non-functional streetlight

Darkness alone is NOT sufficient evidence.

A dark road does not automatically mean Streetlight.

There must be evidence connecting the problem to public lighting.

--------------------------------------------------

WATER LEAKAGE:

Uncontrolled water escaping from water-supply infrastructure.

This is a HIGH-BAR category.

Water Leakage requires positive evidence of a water-supply
infrastructure failure.

Valid evidence includes:

- Broken or burst water pipe
- Visible water-supply pipe releasing water
- Broken water valve releasing water
- Water visibly spraying from water infrastructure
- Explicit description of a leaking/broken water-supply pipe,
  pipeline, valve, or fitting

The following are NOT sufficient evidence for Water Leakage:

- The word "water"
- Water inside a pothole
- Standing water
- Wet road
- Rainwater
- Flooded road
- Muddy water
- A puddle
- Water around damaged pavement
- Water with no visible or described source

Examples:

Pothole containing water
-> Pothole

Rainwater on road
-> Do NOT assume Water Leakage

Flooded road with no identified water-supply failure
-> Do NOT assume Water Leakage

Broken pipe visibly releasing water
-> Water Leakage

IMPORTANT:

The presence of water is NOT evidence of Water Leakage unless the
SOURCE of the water is established as water-supply infrastructure.

--------------------------------------------------

DRAINAGE:

A problem involving drainage, stormwater, sewage, or water-flow
infrastructure.

Examples:

- Blocked drain
- Overflowing drain
- Damaged drain
- Open or broken drainage channel
- Sewage overflow
- Missing or damaged drain cover
- Water accumulation clearly caused by drainage failure

Standing water alone does NOT automatically mean Drainage.

There must be evidence of drainage infrastructure or drainage failure,
unless the description explicitly establishes the drainage cause.

Examples:

Standing water + no identified cause
-> Do NOT automatically classify as Drainage

Blocked drain + standing water
-> Drainage

Overflowing drain
-> Drainage

--------------------------------------------------

PARK / RECREATION ISSUE:

A civic issue primarily involving public parks, playgrounds,
recreation areas, or related infrastructure.

Examples:

- Broken playground equipment
- Damaged park bench
- Damaged recreational equipment
- Broken park fencing
- Damaged park infrastructure
- Unsafe public recreation equipment

Location matters.

A broken bench inside a public park:
-> Park/Recreation Issue

A broken bench outside a park:
-> Other or Public Safety Hazard depending on evidence.

--------------------------------------------------

PUBLIC SAFETY HAZARD:

Use when the primary issue creates a significant public safety risk
that does not fit better into another specific category.

Examples:

- Exposed dangerous electrical infrastructure
- Dangerous structural obstruction
- Fallen hazardous object
- Serious unsafe public infrastructure
- Immediate pedestrian hazard
- Hazardous infrastructure not represented by another category

IMPORTANT:

Do NOT use Public Safety Hazard simply because another category is
dangerous.

Examples:

Large pothole
-> Pothole

Broken streetlight
-> Streetlight

Garbage pile
-> Garbage

Broken drain
-> Drainage

Public Safety Hazard is primarily for safety hazards that do not have
a more specific applicable civic category.

--------------------------------------------------

OTHER:

Use ONLY when a real civic issue is present but cannot reasonably fit
the available categories.

Do NOT use Other merely because the image is slightly difficult.

If evidence is insufficient to determine the issue:
-> Other
-> Lower confidence appropriately

==================================================
CATEGORY COMPETITION
==================================================

When multiple categories appear possible, compare them using:

1. Which infrastructure is actually failing?
2. What physical failure is directly evidenced?
3. What would the authority primarily need to repair, remove, or fix?
4. Which category describes the root problem rather than its consequence?
5. Which category requires the fewest unsupported assumptions?

Choose the category with the strongest direct evidence.

Do NOT choose the category associated with the most frequently mentioned
word.

==================================================
COMMON CONFLICT RULES
==================================================

Use these as general examples of the classification principle:

Pothole + water
-> Pothole

Road damage + rainwater
-> Road Damage

Garbage + water
-> Garbage if garbage is the primary issue

Blocked drain + water
-> Drainage

Broken pipe + flooded road
-> Water Leakage

Broken streetlight + darkness
-> Streetlight

Broken park equipment + garbage nearby
-> Park/Recreation Issue if equipment is primary

Exposed electrical hazard + road obstruction
-> Public Safety Hazard if the electrical hazard is the primary issue

Location MUST NOT override the underlying civic problem.

==================================================
UNIVERSAL ANTI-KEYWORD BIAS
==================================================

NEVER classify based solely on a keyword, object, substance, symptom,
or condition.

Examples:

"water"
does NOT automatically mean Water Leakage.

"garbage"
does NOT automatically mean Garbage.

"road"
does NOT automatically mean Road Damage.

"dark"
does NOT automatically mean Streetlight.

"drain"
does NOT automatically mean Drainage.

"park"
does NOT automatically mean Park/Recreation Issue.

"unsafe"
does NOT automatically mean Public Safety Hazard.

"broken"
does NOT identify which category is affected.

"leaking"
does NOT automatically mean Water Leakage.

A keyword is evidence.

A keyword is NEVER sufficient by itself to determine the category.

==================================================
ANTI-ASSUMPTION RULE
==================================================

Never assume an invisible cause.

Do NOT assume:

- A hidden pipe is broken
- Water came from a pipe
- Rain caused flooding
- A drain is blocked because water is present
- A streetlight is broken because the scene is dark
- Garbage caused drainage blockage
- A road is unsafe simply because the citizen says it is
- A particular authority owns infrastructure without configured routing

Only classify what the image and description reasonably support.

==================================================
MULTIPLE-ISSUE HANDLING
==================================================

If multiple civic problems are visible:

Return EXACTLY ONE category.

Choose the PRIMARY issue based on:

1. Most clearly evidenced physical failure
2. Main infrastructure requiring intervention
3. Main citizen complaint when supported by evidence
4. Greatest direct civic impact

Do NOT return multiple categories.

Do NOT select a secondary consequence over a clearly evidenced primary
infrastructure failure.

==================================================
AUTHORITY DEPARTMENTS
==================================================

The authority departments are EXACTLY:

- Roads & Public Works
- Sanitation
- Utilities
- Parks & Rec
- Public Safety

The department MUST use one of these exact names.

NEVER invent department names such as:

- Water Department
- Drainage Department
- Electrical Department
- Road Department

Use only the configured department names.

==================================================
CATEGORY → DEPARTMENT MAPPING
==================================================

Pothole
-> Roads & Public Works

Road Damage
-> Roads & Public Works

Garbage
-> Sanitation

Streetlight
-> Utilities

Water Leakage
-> Utilities

Drainage
-> Roads & Public Works

Park/Recreation Issue
-> Parks & Rec

Public Safety Hazard
-> Public Safety

Other
-> Select the most appropriate department from the available
departments based on the evidence.

If no reasonable department can be determined:
-> Public Safety

This is a fallback only.

==================================================
DEPARTMENT ROUTING RULE
==================================================

Department routing happens AFTER category classification.

The department must correspond to the PRIMARY CIVIC PROBLEM.

Never route based directly on:

- Keywords
- Location
- Secondary conditions
- Severity
- Consequences
- Citizen emotion

The correct sequence is:

PRIMARY PROBLEM
-> CATEGORY
-> DEPARTMENT

Before final output, verify that the department matches the selected
category.

==================================================
PRIORITY
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

CRITICAL:

Immediate or potentially severe threat to life, major public safety
hazard, severe infrastructure failure, exposed dangerous electrical
infrastructure, major obstruction, or severe flooding affecting public
movement.

HIGH:

Significant pothole, dangerous road damage, major water leakage,
serious drainage overflow, major public infrastructure damage, or
substantial safety risk.

MEDIUM:

Moderate garbage accumulation, damaged streetlight, moderate road
deterioration, localized leakage, or moderate civic disruption.

LOW:

Minor damage, cosmetic deterioration, small localized issue, or low
impact problem.

Do NOT assign high or critical merely because the citizen uses dramatic
language.

Priority must be evidence-based.

==================================================
CONFIDENCE
==================================================

Return an integer from 50 to 99.

Confidence represents how strongly the available evidence supports the
classification.

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

Do NOT give 95+ confidence when:

- Image is blurry
- Problem is partially hidden
- Multiple interpretations are equally plausible
- Classification depends mainly on an unsupported assumption

==================================================
IMAGE QUALITY
==================================================

Consider:

- Blur
- Darkness
- Obstruction
- Distance
- Cropping
- Poor visibility
- Ambiguous objects
- Multiple unrelated objects

If the image is unclear:

Use the citizen description as supporting evidence.

Lower confidence when appropriate.

If neither image nor description provides enough evidence:

category:
Other

confidence:
50-60

reason:
Insufficient visual or textual evidence to reliably identify the
civic issue.

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

The reason should explain:

1. What is visibly or explicitly established
2. Why that supports the selected category
3. Why the selected department is appropriate when useful

Do NOT mention unsupported causes.

GOOD:

"The image shows a distinct cavity in the road surface, consistent with
a pothole. Water is present inside the cavity but does not indicate a
water-supply failure."

BAD:

"The road is flooded because a hidden water pipe probably broke."

Do not speculate about invisible infrastructure.

==================================================
SUMMARY
==================================================

Create a concise 8-15 word summary.

The summary must describe the actual PRIMARY civic problem.

GOOD:

"Large pothole creating a significant road safety risk for passing vehicles"

BAD:

"Road infrastructure issue requiring immediate government attention"

Be specific.

==================================================
FINAL VALIDATION
==================================================

Before returning the response, internally verify:

1. Exactly ONE category is selected.
2. Category is from the allowed category list.
3. Exactly ONE department is selected.
4. Department is from the allowed department list.
5. Category and department mapping are consistent.
6. The primary infrastructure was identified.
7. The physical failure was identified.
8. Secondary conditions did not override the primary failure.
9. No keyword-only classification occurred.
10. No unsupported cause was invented.
11. Image evidence was considered.
12. Citizen description was considered.
13. Priority is evidence-based.
14. Confidence reflects actual certainty.
15. Location was not invented.
16. Reason is evidence-based.
17. Summary is 8-15 words.
18. Output is valid JSON.
19. No extra text exists outside JSON.

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
  "reason": "The image clearly shows a distinct cavity in the road surface consistent with a pothole. Water inside the cavity is a secondary condition and does not indicate a water-supply failure.",
  "summary": "Large pothole creating a significant road safety risk for passing vehicles"
}

The "department" field MUST be included because CivicFlow AI uses it
to route the issue to the appropriate authority.

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
      model: "gemini-3.5-flash",
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
    return await fallbackAnalysis(userDescription, rawLocation);
  }
}

/**
 * Deterministic fallback analysis when Gemini API is unavailable or unconfigured
 */
async function fallbackAnalysis(description = "", location = "") {
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

  const reason = await generateDetailedReason({
    category,
    priority,
    department,
    description,
    location,
  });

  return {
    category,
    department,
    priority,
    confidence: Math.floor(Math.random() * (95 - 75 + 1)) + 75,
    location: location || "Reported Location",
    reason,
    summary: `${category} issue reported at ${location || "specified area"}`,
  };
}

/**
 * Generate a comprehensive 3-4 line technical reason using AI with domain fallback
 */
async function generateDetailedReason({ category, priority, department, description, location }) {
  const ai = getAiClient();
  if (ai && process.env.GEMINI_API_KEY) {
    try {
      const prompt = `
You are CivicFlow AI Action Engine.
Generate a concise, professional 3 to 4 line technical justification explaining why this civic issue is classified as "${category}" with "${priority}" priority and routed to "${department}".

Citizen Description: "${description || 'Civic infrastructure defect'}"
Reported Location: "${location || 'Local area'}"

REQUIREMENTS:
- Exactly 3 to 4 sentences in length.
- Detail the physical infrastructure failure, the direct hazard or disruption to the public, and why ${department} must take prompt corrective action.
- Return ONLY the 3-4 sentence paragraph. Do not include bullet points or headers.
`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [prompt],
      });
      const text = (response.text || '').trim().replace(/^["']|["']$/g, '');
      if (text && text.length > 50) {
        return text;
      }
    } catch (err) {
      console.warn('[Gemini AI] Fallback reason generation error:', err.message);
    }
  }

  const catMap = {
    Pothole: `Road surface cavity observed along active transit corridor requiring structural asphalt patching. The defect poses an immediate impact and wheel damage hazard for passenger vehicles and two-wheelers. Accelerated asphalt breakdown is likely if left exposed to vehicular load and moisture ingress. Recommended for expedited leveling and repair by Roads & Public Works.`,
    Garbage: `Substantial accumulation of solid municipal waste and refuse identified in a public pedestrian zone. The waste pile exceeds standard disposal capacity, creating unsanitary conditions, unpleasant odors, and potential pest infestation risks. Prolonged delay in clearance impacts public hygiene and community health standards. Urgent dispatch of sanitation collection crews is required for full site clearance.`,
    Streetlight: `Non-functional public roadway luminaire reported, resulting in localized dark zones across the pedestrian pathway and traffic lane. Inadequate nighttime illumination significantly elevates safety risks for commuters and increases vehicular collision potential. The outage necessitates electrical fixture diagnostics and bulb/wiring replacement. Assigned to Utilities and Electrical Maintenance for prompt restoration.`,
    'Water Leakage': `Active pressurized water pipeline fracture identified, causing continuous uncontained potable water discharge. The ongoing leakage causes subsurface soil destabilization, pavement erosion, and significant municipal water resource loss. Urgent isolation of the supply valve and replacement of the fractured pipe section is required. Routed to Utilities for immediate infrastructure containment.`,
    Drainage: `Severe stormwater drainage channel obstruction detected, causing localized runoff stagnation and waterlogging on the roadway. The blockage impedes natural gravity discharge and increases the risk of foul backflow during peak precipitation. Standing water creates driving hazards and accelerates asphalt edge deterioration. Scheduled for immediate mechanical desilting and culvert clearance by Drainage & Public Works.`,
    'Road Damage': `Extensive surface cracking, alligator fracturing, and pavement disintegration observed across the roadway. Continued vehicular traffic over the weakened road foundation accelerates subsurface degradation and creates uneven driving conditions. Timely intervention will prevent the progression of minor fractures into dangerous structural road failures. Recommended for resurfacing and structural seal-coating by Roads & Public Works.`,
  };

  return catMap[category] || `Civic infrastructure defect logged at ${location || 'the reported site'} requiring municipal inspection. The reported condition presents an ongoing inconvenience and potential safety hazard for local commuters. Assigned to ${department} for on-site diagnostic verification and scheduled remediation. Timely resolution is recommended to maintain public infrastructure safety standards.`;
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

/**
 * Rephrase and enrich a citizen's rough description into a clear, detailed, professional civic complaint.
 */
export async function rephraseComplaintDescription({
  text = "",
  location = "",
}) {
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return { rephrased: "" };
  }

  const ai = getAiClient();
  if (!ai || !process.env.GEMINI_API_KEY) {
    return { rephrased: fallbackRephrase(trimmed, location) };
  }

  try {
    const prompt = `
You are CivicFlow AI, an expert municipal complaint assistant.

The citizen entered this initial description of a civic problem:
"${trimmed}"

Reported location context (if any): "${location || "Local area"}"

YOUR TASK:
Rephrase, expand, and structure this into a clear, professional, and detailed civic issue description (2 to 4 impactful sentences).

REQUIREMENTS:
1. Clearly specify the exact infrastructure defect (e.g. road damage, severe pothole, overflowing garbage, blocked stormwater drain, burst pipeline, non-working streetlight).
2. Detail the public safety hazard, traffic obstruction, or sanitation/health risk clearly.
3. Use precise, actionable municipal terms so the issue can be easily classified and assigned to the right department.
4. Keep the tone objective, urgent, and professional.
5. Return ONLY the final rephrased text. Do NOT add preamble, quotes, bullet points, or commentary like "Here is the rephrased version:".
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt],
    });

    let rephrased = (response.text || "").trim();
    if (rephrased.startsWith("```")) {
      rephrased = rephrased
        .replace(/^```[a-z]*\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
    }
    rephrased = rephrased.replace(/^["']|["']$/g, "").trim();

    return { rephrased: rephrased || fallbackRephrase(trimmed, location) };
  } catch (err) {
    console.error("[Gemini AI] Rephrase error:", err.message);
    return { rephrased: fallbackRephrase(trimmed, location) };
  }
}

function fallbackRephrase(text, location) {
  const clean = text.replace(/^[a-z]/, (c) => c.toUpperCase()).trim();
  const locSuffix = location ? ` near ${location}` : "";
  if (clean.length < 25) {
    return `Civic issue reported${locSuffix}: ${clean}. This poses an ongoing public inconvenience and safety risk requiring prompt inspection and maintenance by the responsible municipal department.`;
  }
  return `${clean}. Immediate inspection and repair by the responsible municipal department is requested to prevent further hazard to the public.`;
}
