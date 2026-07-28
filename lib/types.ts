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
  ttsVoice?: string;
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
    value: "Fenrir",
    label: "Fenrir",
    tone: "excitable",
    profile: "Excitable, expressive delivery with high energy.",
    bestFor: "Animated characters and enthusiastic conversation.",
  },
  {
    value: "Leda",
    label: "Leda",
    tone: "youthful",
    profile: "Youthful, light delivery with an informal feel.",
    bestFor: "Everyday conversation and social scenarios.",
  },
  {
    value: "Orus",
    label: "Orus",
    tone: "firm",
    profile: "Firm, grounded delivery with a decisive presence.",
    bestFor: "Leadership, negotiation, and direct conversation.",
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
    value: "Autonoe",
    label: "Autonoe",
    tone: "bright",
    profile: "Bright, open delivery with a positive tone.",
    bestFor: "Welcoming conversations and upbeat social scenes.",
  },
  {
    value: "Enceladus",
    label: "Enceladus",
    tone: "breathy",
    profile: "Breathy, intimate delivery with a softer presence.",
    bestFor: "Reflective dialogue and atmospheric storytelling.",
  },
  {
    value: "Umbriel",
    label: "Umbriel",
    tone: "easy-going",
    profile: "Relaxed, unhurried delivery with understated warmth.",
    bestFor: "Casual chats and low-pressure role-play.",
  },
  {
    value: "Algieba",
    label: "Algieba",
    tone: "smooth",
    profile: "Smooth, polished delivery with even pacing.",
    bestFor: "Fluent shadowing and professional conversation.",
  },
  {
    value: "Despina",
    label: "Despina",
    tone: "smooth",
    profile: "Smooth, composed delivery with a natural flow.",
    bestFor: "Interviews, hospitality, and polished dialogue.",
  },
  {
    value: "Erinome",
    label: "Erinome",
    tone: "clear",
    profile: "Clear, focused delivery with crisp articulation.",
    bestFor: "Detailed explanations and listening drills.",
  },
  {
    value: "Algenib",
    label: "Algenib",
    tone: "gravelly",
    profile: "Textured, gravelly delivery with a distinctive character.",
    bestFor: "Character role-play and dramatic storytelling.",
  },
  {
    value: "Rasalgethi",
    label: "Rasalgethi",
    tone: "informative",
    profile: "Measured, informative delivery with an expert feel.",
    bestFor: "Technical explanations and professional scenarios.",
  },
  {
    value: "Laomedeia",
    label: "Laomedeia",
    tone: "upbeat",
    profile: "Upbeat, engaging delivery with conversational momentum.",
    bestFor: "Networking, travel, and lively everyday practice.",
  },
  {
    value: "Achernar",
    label: "Achernar",
    tone: "soft",
    profile: "Soft, gentle delivery with a restrained tone.",
    bestFor: "Reflection, careful listening, and gentle coaching.",
  },
  {
    value: "Alnilam",
    label: "Alnilam",
    tone: "firm",
    profile: "Firm, steady delivery with confident pacing.",
    bestFor: "Debate, presentations, and assertive practice.",
  },
  {
    value: "Schedar",
    label: "Schedar",
    tone: "even",
    profile: "Even, balanced delivery with consistent pacing.",
    bestFor: "Long-form listening and neutral conversation.",
  },
  {
    value: "Gacrux",
    label: "Gacrux",
    tone: "mature",
    profile: "Mature, composed delivery with a seasoned presence.",
    bestFor: "Mentoring, formal meetings, and thoughtful dialogue.",
  },
  {
    value: "Pulcherrima",
    label: "Pulcherrima",
    tone: "forward",
    profile: "Forward, energetic delivery with a strong presence.",
    bestFor: "Sales, persuasion, and fast-moving role-play.",
  },
  {
    value: "Zubenelgenubi",
    label: "Zubenelgenubi",
    tone: "casual",
    profile: "Casual, relaxed delivery with an everyday feel.",
    bestFor: "Small talk and natural social conversation.",
  },
  {
    value: "Vindemiatrix",
    label: "Vindemiatrix",
    tone: "gentle",
    profile: "Gentle, reassuring delivery with soft pacing.",
    bestFor: "Supportive conversations and careful listening.",
  },
  {
    value: "Sadachbia",
    label: "Sadachbia",
    tone: "lively",
    profile: "Lively, animated delivery with expressive rhythm.",
    bestFor: "Storytelling and energetic social scenarios.",
  },
  {
    value: "Sadaltager",
    label: "Sadaltager",
    tone: "knowledgeable",
    profile: "Knowledgeable, assured delivery with an expert tone.",
    bestFor: "Teaching, consulting, and in-depth explanations.",
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
