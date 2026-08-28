/**
 * Conversational Check-in Extraction Service
 * Bounded natural-language health habits extractor.
 * Converts free-form daily log text into structured check-in fields with strict Zod validation.
 */

import { z } from "zod";
import { routeCompletion } from "./ai-provider-router.js";

// Deterministic emergency safety check
const EMERGENCY_PATTERNS = [
  /\b(chest pain|heart attack|angina|pressure in chest|crushing chest)\b/i,
  /\b(cannot breathe|can't breathe|severe shortness of breath|gasping for air|struggling to breathe)\b/i,
  /\b(fainted|passed out|loss of consciousness|blacked out)\b/i,
  /\b(stroke|sudden numbness|face drooping|slurred speech|facial droop)\b/i,
  /\b(coughing up blood|vomiting blood|severe allergic reaction|anaphylaxis)\b/i,
];

export function checkEmergencySymptoms(text) {
  if (!text || typeof text !== "string") return null;
  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(text)) {
      return "If these symptoms are severe, sudden, worsening, or happening now, seek urgent medical attention or contact local emergency services. I cannot diagnose the cause. Do not wait for this app or an AI response in an emergency.";
    }
  }
  return null;
}

export const extractionSchema = z.object({
  wellbeing: z.enum(["great", "good", "okay", "tired", "not_great"]).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  waterGlasses: z.number().min(0).max(30).nullable().optional(),
  exerciseMinutes: z.number().min(0).max(600).nullable().optional(),
  exerciseType: z.string().max(60).nullable().optional(),
  foodQuality: z.string().max(60).nullable().optional(),
  weightKg: z.number().min(20).max(400).nullable().optional(),
  systolicBP: z.number().min(60).max(260).nullable().optional(),
  diastolicBP: z.number().min(30).max(200).nullable().optional(),
  bloodGlucose: z.number().min(1).max(900).nullable().optional(),
  bloodGlucoseUnit: z.enum(["mg/dL", "mmol/L"]).nullable().optional(),
  symptoms: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.string().max(1000).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  fieldConfidence: z.record(z.enum(["high", "medium", "low"])).default({}),
  isAmbiguous: z.boolean().default(false),
  ambiguityReason: z.string().nullable().optional(),
}).strict();

const SYSTEM_EXTRACTION_PROMPT = `You are a bounded, deterministic health data extraction assistant for HealthGuardian AI.
Your ONLY task is to extract explicitly stated daily lifestyle metrics from the user's free-form text.

CRITICAL EXTRACTION RULES:
1. Extract ONLY explicitly stated values.
2. If a field was NOT mentioned by the user, you MUST set its value to null. NEVER assume, guess, or infer 0 for unmentioned fields.
3. If an explicit 0 is stated (e.g., "0 minutes exercise" or "no water"), set value to 0.
4. If a value is ambiguous or uncertain (e.g. "I slept between 5 and 6 hours", "exercised a lot"), set isAmbiguous: true and set ambiguityReason explaining what is uncertain. Set field value to the best estimate or null with confidence: "low".
5. NEVER generate a medical diagnosis. NEVER recommend medication changes.
6. NEVER execute actions or plan steps. Return pure structured JSON only matching the schema.

Schema JSON fields:
{
  "wellbeing": "great" | "good" | "okay" | "tired" | "not_great" | null,
  "sleepHours": number | null,
  "waterGlasses": number | null,
  "exerciseMinutes": number | null,
  "exerciseType": string | null,
  "foodQuality": string | null,
  "weightKg": number | null,
  "systolicBP": number | null,
  "diastolicBP": number | null,
  "bloodGlucose": number | null,
  "bloodGlucoseUnit": "mg/dL" | "mmol/L" | null,
  "symptoms": string[],
  "tags": string[],
  "notes": string | null,
  "date": "YYYY-MM-DD" | null,
  "fieldConfidence": { [fieldName]: "high" | "medium" | "low" },
  "isAmbiguous": boolean,
  "ambiguityReason": string | null
}`;

/**
 * Intelligent deterministic rule-based extractor used as fallback or offline validator.
 */
export function extractWithRules(text) {
  const norm = text.toLowerCase();
  const res = {
    wellbeing: null,
    sleepHours: null,
    waterGlasses: null,
    exerciseMinutes: null,
    exerciseType: null,
    foodQuality: null,
    weightKg: null,
    systolicBP: null,
    diastolicBP: null,
    bloodGlucose: null,
    bloodGlucoseUnit: "mg/dL",
    symptoms: [],
    tags: [],
    notes: null,
    date: null,
    fieldConfidence: {},
    isAmbiguous: false,
    ambiguityReason: null,
  };

  // Ambiguity check
  if (/(between\s+\d+\s+and\s+\d+|\d+\s*-\s*\d+\s*hours|\d+\s+or\s+\d+\s+hours|somewhere\s+between|exercised\s+a\s+lot|a\s+few\s+glasses)/i.test(norm)) {
    res.isAmbiguous = true;
    res.ambiguityReason = "Range or approximate value detected in your description. Please review or adjust values.";
  }

  // Wellbeing
  if (/\b(feeling great|felt great|feel great|super good|amazing)\b/i.test(norm)) {
    res.wellbeing = "great";
    res.fieldConfidence.wellbeing = "high";
  } else if (/\b(feeling good|felt good|feel good|pretty good)\b/i.test(norm)) {
    res.wellbeing = "good";
    res.fieldConfidence.wellbeing = "high";
  } else if (/\b(feeling okay|felt okay|feel okay|was okay|okay|alright|fine)\b/i.test(norm)) {
    res.wellbeing = "okay";
    res.fieldConfidence.wellbeing = "high";
  } else if (/\b(tired|exhausted|sleepy|drained|fatigued)\b/i.test(norm)) {
    res.wellbeing = "tired";
    res.fieldConfidence.wellbeing = "high";
  } else if (/\b(not great|felt bad|feeling down|unwell|terrible)\b/i.test(norm)) {
    res.wellbeing = "not_great";
    res.fieldConfidence.wellbeing = "high";
  }

  // Sleep
  const sleepMatch = norm.match(/(?:slept|sleep|rested)\s*(?:for\s*)?(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)/i) ||
                     norm.match(/(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)\s*(?:of\s*)?sleep/i);
  if (sleepMatch && sleepMatch[1]) {
    res.sleepHours = Number(sleepMatch[1]);
    res.fieldConfidence.sleepHours = res.isAmbiguous ? "medium" : "high";
  } else if (/\b(half an hour|30 mins?)\s*(?:of\s*)?sleep\b/i.test(norm)) {
    res.sleepHours = 0.5;
    res.fieldConfidence.sleepHours = "high";
  }

  // Water
  const waterMatch = norm.match(/(?:drank|drink|had|water)\s*(?:about\s*)?(\d+)\s*(?:glasses|glass|cups|bottles)?\s*(?:of\s*water)?/i) ||
                     norm.match(/(\d+)\s*(?:glasses|glass|cups)\s*(?:of\s*)?water/i);
  if (waterMatch && waterMatch[1]) {
    res.waterGlasses = Number(waterMatch[1]);
    res.fieldConfidence.waterGlasses = res.isAmbiguous ? "medium" : "high";
  }

  // Exercise
  const exerciseMatch = norm.match(/(?:walked|ran|jogged|exercised|worked out|cycling|swimming|activity)\s*(?:for\s*)?(\d+)\s*(?:minutes|mins|m)/i) ||
                        norm.match(/(\d+)\s*(?:minutes|mins|m)\s*(?:of\s*)?(?:exercise|walking|running|workout|activity)/i);
  if (exerciseMatch && exerciseMatch[1]) {
    res.exerciseMinutes = Number(exerciseMatch[1]);
    res.fieldConfidence.exerciseMinutes = res.isAmbiguous ? "medium" : "high";
  } else if (/\b(walked for half an hour|half an hour walk|half an hour exercise)\b/i.test(norm)) {
    res.exerciseMinutes = 30;
    res.fieldConfidence.exerciseMinutes = "high";
  }

  // Exercise type
  if (/\b(walk|walking|walked)\b/i.test(norm)) res.exerciseType = "Walking";
  else if (/\b(run|running|ran|jogging)\b/i.test(norm)) res.exerciseType = "Running";
  else if (/\b(swim|swimming)\b/i.test(norm)) res.exerciseType = "Swimming";
  else if (/\b(gym|strength|weights)\b/i.test(norm)) res.exerciseType = "Strength Training";
  else if (/\b(cycling|bike|biking)\b/i.test(norm)) res.exerciseType = "Cycling";

  // Blood Pressure
  const bpMatch = norm.match(/\b(?:bp|blood pressure)\s*(?:was|is)?\s*(\d{2,3})\s*(?:\/|over)\s*(\d{2,3})\b/i);
  if (bpMatch && bpMatch[1] && bpMatch[2]) {
    res.systolicBP = Number(bpMatch[1]);
    res.diastolicBP = Number(bpMatch[2]);
    res.fieldConfidence.systolicBP = "high";
    res.fieldConfidence.diastolicBP = "high";
  }

  // Blood Glucose
  const glucoseMatch = norm.match(/\b(?:glucose|blood sugar|sugar)\s*(?:was|is)?\s*(\d{2,3})\b/i);
  if (glucoseMatch && glucoseMatch[1]) {
    res.bloodGlucose = Number(glucoseMatch[1]);
    res.fieldConfidence.bloodGlucose = "high";
  }

  // Context tags
  if (/\b(travel|traveling|flight|trip|transit)\b/i.test(norm)) res.tags.push("Traveling");
  if (/\b(busy day|hectic|lots of work|meetings)\b/i.test(norm)) res.tags.push("Busy day");
  if (/\b(poor sleep|insomnia|restless|bad sleep)\b/i.test(norm)) res.tags.push("Poor sleep");
  if (/\b(more active|long walk|workout session)\b/i.test(norm)) res.tags.push("More active");
  if (/\b(eating differently|fasting|heavy meal|diet change)\b/i.test(norm)) res.tags.push("Eating differently");

  // Symptoms
  if (/\b(headache|migraine)\b/i.test(norm)) res.symptoms.push("headache");
  if (/\b(fatigue|tiredness)\b/i.test(norm)) res.symptoms.push("fatigue");
  if (/\b(nausea|upset stomach)\b/i.test(norm)) res.symptoms.push("nausea");
  if (/\b(dizziness|dizzy|lightheaded)\b/i.test(norm)) res.symptoms.push("dizziness");

  return res;
}

/**
 * Executes bounded conversational extraction using the AI provider router with safe rule-based fallback.
 */
export async function extractConversationalCheckin(userText) {
  const text = (userText || "").trim();
  if (!text) {
    return { ok: false, error: "Please enter your check-in description." };
  }

  // 1. Safety Gate Check
  const emergency = checkEmergencySymptoms(text);
  if (emergency) {
    return {
      ok: false,
      emergency: true,
      emergencyMessage: emergency,
    };
  }

  // 2. Try LLM Extraction via Router
  try {
    const messages = [
      { role: "system", content: SYSTEM_EXTRACTION_PROMPT },
      { role: "user", content: text },
    ];

    const aiRes = await routeCompletion({
      messages,
      temperature: 0.1,
      maxTokens: 500,
      json: true,
    });

    if (aiRes?.ok && typeof aiRes.text === "string") {
      let rawJson;
      try {
        rawJson = JSON.parse(aiRes.text);
      } catch {
        // Strip markdown code fences if present
        const cleaned = aiRes.text.replace(/```(?:json)?/g, "").trim();
        rawJson = JSON.parse(cleaned);
      }

      const validated = extractionSchema.safeParse(rawJson);
      if (validated.success) {
        return {
          ok: true,
          data: validated.data,
          provider: aiRes.provider,
          source: "conversational",
        };
      }
    }
  } catch (err) {
    // Fall through to deterministic rule-based extractor
  }

  // 3. Fallback to Rule-Based Extractor
  const ruleData = extractWithRules(text);
  const validatedRule = extractionSchema.safeParse(ruleData);
  if (validatedRule.success) {
    return {
      ok: true,
      data: validatedRule.data,
      provider: "rule_fallback",
      source: "conversational",
    };
  }

  return {
    ok: false,
    error: "I couldn't understand that check-in clearly. You can edit the text or use Quick Check-in.",
  };
}
