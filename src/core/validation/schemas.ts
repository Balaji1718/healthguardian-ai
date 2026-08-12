import { z } from "zod";

const optionalNumber = (min: number, max: number) =>
  z
    .union([z.coerce.number().min(min).max(max), z.literal(""), z.undefined(), z.null()])
    .transform((v) => (v === "" || v === undefined || v === null ? null : Number(v)));

export const authSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export const registerSchema = authSchema.extend({
  displayName: z.string().min(2, "Enter your name").max(60),
});

/** Every check-in field is optional: unknown values stay unknown, never fake zeros. */
export const checkinSchema = z.object({
  sleepHours: optionalNumber(0, 24),
  waterGlasses: optionalNumber(0, 30),
  exerciseMinutes: optionalNumber(0, 600),
  exerciseType: z.string().max(40).optional(),
  foodQuality: z.string().optional(),
  weightKg: optionalNumber(20, 400),
  wellbeing: z.string().optional(),
  systolicBP: optionalNumber(60, 260),
  diastolicBP: optionalNumber(30, 200),
  bloodGlucose: optionalNumber(1, 900),
  bloodGlucoseUnit: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export const profileSchema = z.object({
  firstName: z.string().max(60),
  lastName: z.string().max(60),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  heightCm: optionalNumber(50, 260),
  preferredLanguage: z.string().default("en"),
  timezone: z.string().default("Asia/Kolkata"),
});

export const healthProfileSchema = z.object({
  knownConditions: z.string().optional(),
  allergies: z.string().optional(),
  familyHistory: z.string().optional(),
  currentMedications: z.string().optional(),
  bloodGroup: z.string().optional(),
  baselineWeightKg: optionalNumber(20, 400),
  baselineHeightCm: optionalNumber(50, 260),
  dietType: z.string().optional(),
  exercisePreference: z.string().optional(),
  preferredReminderTime: z.string().optional(),
  emergencyNotes: z.string().max(500).optional(),
});

export const goalSchema = z.object({
  title: z.string().min(3, "Give the goal a short title").max(80),
  goalType: z.string().min(1),
  description: z.string().max(300).optional(),
  targetValue: optionalNumber(0, 100000),
  unit: z.string().max(20).optional(),
  frequency: z.string().min(1),
  targetDate: z.string().optional(),
});

export const reportMetaSchema = z.object({
  reportTitle: z.string().min(2, "Add a title").max(100),
  reportType: z.string().min(1),
  reportDate: z.string().min(1, "Select the report date"),
  laboratoryName: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const supportSchema = z.object({
  type: z.string().min(1),
  reason: z.string().min(3, "Tell us briefly why").max(120),
  message: z.string().max(1000).optional(),
  priority: z.enum(["low", "normal", "high"]),
});

/** Comma-separated text field → clean array (never [""]). */
export const toList = (v?: string) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
