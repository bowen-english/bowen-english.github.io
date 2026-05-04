export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};

export type CoachContextMode =
  | "latest_user"
  | "latest_user_with_partner"
  | "recent_full";

export type CoachExplanationLanguage = "zh" | "en";

export type CoachSeverity = "none" | "minor" | "major";

export type CoachSettings = {
  openRouterApiKey: string;
  chatModel: string;
  coachModel: string;
  ttsModel: string;
  ttsVoice: string;
  contextMode: CoachContextMode;
  explanationLanguage: CoachExplanationLanguage;
  recentTurns: number;
};

export type OpenRouterModel = {
  id: string;
  name: string;
  contextLength: number | null;
  promptPrice: string | null;
  completionPrice: string | null;
  inputModalities: string[];
  outputModalities: string[];
  supportsJson: boolean;
};

export type CoachFeedback = {
  id: string;
  messageId: string;
  original: string;
  corrected: string;
  natural: string;
  issues: string[];
  explanation?: string;
  explanationZh?: string;
  pattern: string;
  severity: CoachSeverity;
  createdAt: string;
};

export type ConversationSession = {
  id: string;
  title: string;
  titleEdited?: boolean;
  scenario?: string;
  speechEnabled?: boolean;
  hideAssistantText?: boolean;
  messages: ChatMessage[];
  feedback: CoachFeedback[];
  createdAt: string;
  updatedAt: string;
};

export type ScenarioPreset = {
  id: string;
  label: string;
  value: string;
};

export type CoachContextOption = {
  value: CoachContextMode;
  label: string;
};

export const DEFAULT_CHAT_MODEL = "x-ai/grok-4.1-fast";

export const DEFAULT_COACH_MODEL = "google/gemini-3.1-flash-lite-preview";

export const DEFAULT_TTS_MODEL = "openai/gpt-4o-mini-tts-2025-12-15";

export const DEFAULT_TTS_VOICE = "nova";

export const COACH_CONTEXT_OPTIONS: CoachContextOption[] = [
  { value: "latest_user", label: "Latest user sentence only" },
  {
    value: "latest_user_with_partner",
    label: "Latest sentence + previous partner reply",
  },
  { value: "recent_full", label: "Recent full conversation turns" },
];

export const DEFAULT_SETTINGS: CoachSettings = {
  openRouterApiKey: "",
  chatModel: DEFAULT_CHAT_MODEL,
  coachModel: DEFAULT_COACH_MODEL,
  ttsModel: DEFAULT_TTS_MODEL,
  ttsVoice: DEFAULT_TTS_VOICE,
  contextMode: "latest_user_with_partner",
  explanationLanguage: "zh",
  recentTurns: 4,
};

export const DEFAULT_SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "coffee-chat",
    label: "Coffee chat",
    value:
      "You are chatting casually with a friendly colleague at a coffee shop before work.",
  },
  {
    id: "job-interview",
    label: "Job interview",
    value:
      "You are in a job interview. The Chat Partner is the interviewer asking realistic follow-up questions.",
  },
  {
    id: "travel-help",
    label: "Travel help",
    value:
      "You are traveling abroad and asking for help with directions, transport, food, or local recommendations.",
  },
  {
    id: "work-update",
    label: "Work update",
    value:
      "You are giving a short work update in a meeting and answering follow-up questions from a teammate.",
  },
  {
    id: "daily-life",
    label: "Daily life",
    value:
      "You are talking about ordinary daily life, habits, plans, feelings, and small personal stories.",
  },
];
