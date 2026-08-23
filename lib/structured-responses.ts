import { z } from "zod";
import type { CoachFeedback } from "./types";

export type NormalizedCoachResponse = Omit<
  CoachFeedback,
  "id" | "createdAt"
>;

const coachResponseSchema = z
  .object({
    original: z.string().optional(),
    corrected: z.string(),
    natural: z.string(),
    issues: z.array(z.string()).default([]),
    explanation: z.string().optional(),
    explanationZh: z.string().optional(),
    pattern: z.string().default(""),
    severity: z.enum(["none", "minor", "major"]),
  })
  .passthrough();

const voiceChoiceSchema = z.object({ voice: z.string() }).passthrough();

export function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return trimmed;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

export function parseCoachResponse({
  raw,
  messageId,
  original,
}: {
  raw: string;
  messageId: string;
  original: string;
}): NormalizedCoachResponse {
  const parsed = coachResponseSchema.parse(
    JSON.parse(extractJsonObject(raw)) as unknown,
  );
  const normalizedOriginal = original.trim() || parsed.original?.trim() || "";
  const corrected = parsed.corrected.trim() || normalizedOriginal;
  const natural = parsed.natural.trim() || corrected;

  return {
    messageId,
    original: normalizedOriginal,
    corrected,
    natural,
    issues: parsed.issues.map((issue) => issue.trim()).filter(Boolean),
    explanation: (parsed.explanation ?? parsed.explanationZh ?? "").trim(),
    pattern: parsed.pattern.trim(),
    severity: parsed.severity,
  };
}

export function parseVoiceChoice({
  raw,
  allowedVoices,
  fallback,
}: {
  raw: string;
  allowedVoices: string[];
  fallback: string;
}) {
  try {
    const parsed = voiceChoiceSchema.parse(
      JSON.parse(extractJsonObject(raw)) as unknown,
    );
    const voicesByLowercase = new Map(
      allowedVoices.map((voice) => [voice.toLowerCase(), voice]),
    );

    return (
      voicesByLowercase.get(parsed.voice.trim().toLowerCase()) ??
      voicesByLowercase.get(fallback.trim().toLowerCase()) ??
      allowedVoices[0] ??
      fallback
    );
  } catch {
    return fallback;
  }
}
