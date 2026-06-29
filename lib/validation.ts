import { z } from "zod";
import { ApplicationStatus } from "@/types";

export const LIMITS = {
  jobSearchName: 30,
  role: 100,
  company: 100,
  location: 100,
  event: 30,
  note: 10000,
} as const;

export function limitText(value: string, max: number): string {
  return value.slice(0, max);
}

const trimmed = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

const optionalTrimmed = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v ? v : undefined)); // Normalize empty strings to undefined so optional fields stay null in the DB.

export const jobSearchNameSchema = trimmed(
  LIMITS.jobSearchName,
  "Job search name",
);

export const applicationFieldsSchema = z.object({
  role: trimmed(LIMITS.role, "Role"),
  company: trimmed(LIMITS.company, "Company"),
  location: optionalTrimmed(LIMITS.location, "Location"),
});

export const applicationStatusSchema = z.enum(ApplicationStatus);
export const applicationFollowUpSchema = z.boolean();

export const timelineEventSchema = z.object({
  event: trimmed(LIMITS.event, "Event"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  note: optionalTrimmed(LIMITS.note, "Note"),
});

export type ApplicationFields = z.infer<typeof applicationFieldsSchema>;
export type TimelineEventInput = z.infer<typeof timelineEventSchema>;
