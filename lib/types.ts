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
  rebuttal?: string;
  revisedAt?: string;
  createdAt: string;
};

export type MessageEditRequest = {
  messageId: string;
  draft: string;
  requestId: number;
  feedbackId?: string;
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

export type TtsVoiceOption = {
  value: string;
  label: string;
  tone: string;
  profile: string;
  bestFor: string;
};

export type CoachContextOption = {
  value: CoachContextMode;
  label: string;
};

export const DEFAULT_CHAT_MODEL = "openai/gpt-5.6-luna";

export const DEFAULT_COACH_MODEL = "openai/gpt-5.6-luna";

export const DEFAULT_TTS_MODEL = "google/gemini-3.1-flash-tts-preview";

export const DEFAULT_TTS_VOICE = "Achird";

export const TTS_VOICE_OPTIONS: TtsVoiceOption[] = [
  {
    value: "Achird",
    label: "Achird",
    tone: "friendly",
    profile: "Friendly, approachable conversational delivery.",
    bestFor: "Default daily English practice.",
  },
  {
    value: "Iapetus",
    label: "Iapetus",
    tone: "clear",
    profile: "Clear, precise delivery that is easy to follow by ear.",
    bestFor: "Listening practice and careful explanations.",
  },
  {
    value: "Sulafat",
    label: "Sulafat",
    tone: "warm",
    profile: "Warm, welcoming delivery with a natural cadence.",
    bestFor: "Casual conversation and supportive coaching.",
  },
  {
    value: "Zephyr",
    label: "Zephyr",
    tone: "bright",
    profile: "Bright, crisp delivery with an energetic feel.",
    bestFor: "Friendly chats and lively practice.",
  },
  {
    value: "Puck",
    label: "Puck",
    tone: "upbeat",
    profile: "Upbeat, animated delivery with playful energy.",
    bestFor: "Role-play, storytelling, and natural banter.",
  },
  {
    value: "Charon",
    label: "Charon",
    tone: "informative",
    profile: "Informative, composed, presenter-like delivery.",
    bestFor: "Explanations, interviews, and work scenarios.",
  },
  {
    value: "Kore",
    label: "Kore",
    tone: "firm",
    profile: "Firm, confident delivery with strong articulation.",
    bestFor: "Presentations and professional practice.",
  },
  {
    value: "Leda",
    label: "Leda",
    tone: "youthful",
    profile: "Youthful, light delivery with an informal feel.",
    bestFor: "Everyday conversation and social scenarios.",
  },
  {
    value: "Aoede",
    label: "Aoede",
    tone: "breezy",
    profile: "Breezy, relaxed delivery with an easy rhythm.",
    bestFor: "Travel scenes and casual conversation.",
  },
  {
    value: "Callirrhoe",
    label: "Callirrhoe",
    tone: "easy-going",
    profile: "Easy-going delivery with a calm conversational pace.",
    bestFor: "Beginner-friendly and low-pressure practice.",
  },
  {
    value: "Algieba",
    label: "Algieba",
    tone: "smooth",
    profile: "Smooth, polished delivery with even pacing.",
    bestFor: "Fluent shadowing and professional conversation.",
  },
  {
    value: "Achernar",
    label: "Achernar",
    tone: "soft",
    profile: "Soft, gentle delivery with a restrained tone.",
    bestFor: "Reflection, careful listening, and gentle coaching.",
  },
];

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
