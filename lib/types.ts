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
  messages: ChatMessage[];
  feedback: CoachFeedback[];
  createdAt: string;
  updatedAt: string;
};

export type CoachContextOption = {
  value: CoachContextMode;
  label: string;
};

export const DEFAULT_CHAT_MODEL = "x-ai/grok-4.1-fast";

export const DEFAULT_COACH_MODEL = "google/gemini-3.1-flash-lite-preview";

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
  contextMode: "latest_user_with_partner",
  explanationLanguage: "zh",
  recentTurns: 4,
};
