"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, KeyRound, Plus, Settings } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { CoachPanel } from "@/components/coach-panel";
import { HistoryPanel } from "@/components/history-panel";
import { SettingsPanel } from "@/components/settings-panel";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import {
  deleteCachedAudioBlob,
  getCachedAudioBlob,
  putCachedAudioBlob,
} from "@/lib/audio-cache";
import {
  callOpenRouterFromBrowser,
  callOpenRouterSpeechFromBrowser,
  fetchOpenRouterModelsFromBrowser,
} from "@/lib/openrouter-browser";
import {
  CHAT_PARTNER_SYSTEM_PROMPT,
  SILENT_COACH_SYSTEM_PROMPT,
} from "@/lib/prompts";
import {
  DEFAULT_SCENARIO_PRESETS,
  DEFAULT_SETTINGS,
  type ChatMessage,
  type CoachContextMode,
  type CoachExplanationLanguage,
  type CoachFeedback,
  type CoachSettings,
  type ConversationSession,
  type OpenRouterModel,
  type ScenarioPreset,
} from "@/lib/types";

const LEGACY_MESSAGE_STORAGE_KEY = "english-shadow-coach.messages";
const LEGACY_FEEDBACK_STORAGE_KEY = "english-shadow-coach.feedback";
const SESSIONS_STORAGE_KEY = "english-shadow-coach.sessions";
const CURRENT_SESSION_STORAGE_KEY = "english-shadow-coach.current-session-id";
const SETTINGS_STORAGE_KEY = "english-shadow-coach.settings";
const SCENARIO_PRESETS_STORAGE_KEY = "english-shadow-coach.scenario-presets";
const EMPTY_MESSAGES: ChatMessage[] = [];
const EMPTY_FEEDBACK: CoachFeedback[] = [];
const LEGACY_DEFAULT_CHAT_MODELS = new Set([
  "x-ai/grok-4.1-fast",
  "x-ai/grok-4.3-fast",
]);
const LEGACY_DEFAULT_COACH_MODELS = new Set([
  "google/gemini-3.1-flash-lite-preview",
]);
const ACCIDENTAL_TTS_DEFAULT_MODEL = "google/gemini-3.5-flash";

type CoachResponse = Omit<CoachFeedback, "id" | "createdAt">;

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function getSessionTitle(messages: ChatMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const title = firstUserMessage?.content.replace(/\s+/g, " ").trim();

  if (!title) {
    return "New conversation";
  }

  return title.length > 56 ? `${title.slice(0, 56)}...` : title;
}

function createSession({
  id = makeId(),
  messages = [],
  feedback = [],
}: {
  id?: string;
  messages?: ChatMessage[];
  feedback?: CoachFeedback[];
} = {}): ConversationSession {
  const now = new Date().toISOString();

  return {
    id,
    title: getSessionTitle(messages),
    titleEdited: false,
    scenario: "",
    speechEnabled: false,
    hideAssistantText: false,
    messages,
    feedback,
    createdAt: now,
    updatedAt: now,
  };
}

function applySessionPatch(
  session: ConversationSession,
  patch: Partial<
    Pick<
      ConversationSession,
      | "messages"
      | "feedback"
      | "scenario"
      | "speechEnabled"
      | "hideAssistantText"
    >
  >,
) {
  const messages = patch.messages ?? session.messages;

  return {
    ...session,
    ...patch,
    title: session.titleEdited ? session.title : getSessionTitle(messages),
    updatedAt: new Date().toISOString(),
  };
}

function buildChatSystemPrompt(scenario: string, speechEnabled: boolean) {
  const trimmedScenario = scenario.trim();
  const speechPrompt = speechEnabled
    ? `

Speech mode:
- Your reply may be spoken aloud with text-to-speech.
- Use natural spoken English: clear, conversational, and easy to follow by ear.
- Prefer short sentences and smooth phrasing over dense lists or written-style structure.
- Do not mention that speech mode is enabled unless it is directly relevant.`
    : "";

  if (!trimmedScenario) {
    return `${CHAT_PARTNER_SYSTEM_PROMPT}${speechPrompt}`;
  }

  return `${CHAT_PARTNER_SYSTEM_PROMPT}${speechPrompt}

Scenario:
${trimmedScenario}

Stay inside this scenario naturally. If the user's message does not fit the scenario perfectly, adapt gracefully and keep the conversation moving.`;
}

function buildCoachSystemPrompt(speechEnabled: boolean) {
  if (!speechEnabled) {
    return SILENT_COACH_SYSTEM_PROMPT;
  }

  return `${SILENT_COACH_SYSTEM_PROMPT}

Speech mode:
- Treat the user's message as spoken English practice.
- Prioritize feedback on natural spoken phrasing, pronunciation-friendly wording, rhythm, and conversational tone.
- Do not overcorrect informal spoken English that sounds natural in conversation.`;
}

function readStoredArray<T>(key: string): T[] {
  try {
    const value = window.localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function mergeSettings(settings: Partial<CoachSettings>): CoachSettings {
  const merged = {
    ...DEFAULT_SETTINGS,
    ...settings,
    openRouterApiKey: settings.openRouterApiKey ?? "",
    chatModel: settings.chatModel || DEFAULT_SETTINGS.chatModel,
    coachModel: settings.coachModel || DEFAULT_SETTINGS.coachModel,
    ttsModel: settings.ttsModel || DEFAULT_SETTINGS.ttsModel,
    ttsVoice: settings.ttsVoice || DEFAULT_SETTINGS.ttsVoice,
    contextMode: settings.contextMode || DEFAULT_SETTINGS.contextMode,
    explanationLanguage:
      settings.explanationLanguage || DEFAULT_SETTINGS.explanationLanguage,
    recentTurns: settings.recentTurns || DEFAULT_SETTINGS.recentTurns,
  };

  return migrateDefaultModelSettings(merged);
}

function migrateDefaultModelSettings(settings: CoachSettings): CoachSettings {
  return {
    ...settings,
    chatModel: LEGACY_DEFAULT_CHAT_MODELS.has(settings.chatModel)
      ? DEFAULT_SETTINGS.chatModel
      : settings.chatModel,
    coachModel: LEGACY_DEFAULT_COACH_MODELS.has(settings.coachModel)
      ? DEFAULT_SETTINGS.coachModel
      : settings.coachModel,
    ttsModel:
      settings.ttsModel === ACCIDENTAL_TTS_DEFAULT_MODEL
        ? DEFAULT_SETTINGS.ttsModel
        : settings.ttsModel,
  };
}

function isScenarioPresetLike(preset: unknown): preset is Partial<ScenarioPreset> {
  return Boolean(preset && typeof preset === "object");
}

function normalizeScenarioPresets(presets: unknown): ScenarioPreset[] {
  if (!Array.isArray(presets)) {
    return DEFAULT_SCENARIO_PRESETS;
  }

  return presets
    .filter(isScenarioPresetLike)
    .map((preset, index) => ({
      id: preset.id || `preset-${index}`,
      label: preset.label?.trim() ?? "",
      value: preset.value?.trim() ?? "",
    }))
    .filter((preset) => preset.label && preset.value);
}

function isChatMessage(
  message: ChatMessage | undefined,
): message is ChatMessage {
  return Boolean(message);
}

function pickCoachContext({
  messages,
  mode,
  recentTurns,
}: {
  messages: ChatMessage[];
  mode: CoachContextMode;
  recentTurns: number;
}) {
  if (mode === "latest_user") {
    return [messages[messages.length - 1]].filter(isChatMessage);
  }

  if (mode === "latest_user_with_partner") {
    const latestUser = messages[messages.length - 1];
    const previousAssistant = [...messages]
      .slice(0, -1)
      .reverse()
      .find((message) => message.role === "assistant");

    return [previousAssistant, latestUser].filter(isChatMessage);
  }

  const userIndexes = messages.reduce<number[]>((indexes, message, index) => {
    if (message.role === "user") {
      indexes.push(index);
    }
    return indexes;
  }, []);
  const startIndex = userIndexes[Math.max(0, userIndexes.length - recentTurns)];

  return messages.slice(startIndex ?? 0);
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return trimmed;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function getExplanationLanguageName(language: CoachExplanationLanguage) {
  return language === "zh" ? "Chinese (Simplified)" : "English";
}

function normalizeCoachResponse(raw: string, messageId: string): CoachResponse {
  const parsed = JSON.parse(extractJsonObject(raw)) as Partial<CoachResponse>;
  const severity =
    parsed.severity === "none" ||
    parsed.severity === "minor" ||
    parsed.severity === "major"
      ? parsed.severity
      : "minor";
  const explanation = parsed.explanation ?? parsed.explanationZh ?? "";

  return {
    messageId,
    original: parsed.original ?? "",
    corrected: parsed.corrected ?? "",
    natural: parsed.natural ?? "",
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    explanation,
    pattern: parsed.pattern ?? "",
    severity,
  };
}

function getAssistantAudioCacheKey({
  messageId,
  model,
  voice,
}: {
  messageId: string;
  model: string;
  voice: string;
}) {
  return `assistant-audio:${messageId}:${model}:${voice}`;
}

export default function Home() {
  const [sessions, setSessions, sessionsHydrated] = useLocalStorageState<
    ConversationSession[]
  >(SESSIONS_STORAGE_KEY, []);
  const [currentSessionId, setCurrentSessionId, currentSessionHydrated] =
    useLocalStorageState<string | null>(CURRENT_SESSION_STORAGE_KEY, null);
  const [settings, setSettings, settingsHydrated] =
    useLocalStorageState<CoachSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  const [scenarioPresets, setScenarioPresets] = useLocalStorageState<
    ScenarioPreset[]
  >(SCENARIO_PRESETS_STORAGE_KEY, DEFAULT_SCENARIO_PRESETS);
  const effectiveSettings = useMemo(() => mergeSettings(settings), [settings]);
  const effectiveScenarioPresets = useMemo(
    () => normalizeScenarioPresets(scenarioPresets),
    [scenarioPresets],
  );

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }

    setSettings((current) => {
      const migrated = mergeSettings(current);

      if (
        migrated.chatModel === current.chatModel &&
        migrated.coachModel === current.coachModel &&
        migrated.ttsModel === current.ttsModel
      ) {
        return current;
      }

      return migrated;
    });
  }, [settingsHydrated, setSettings]);
  const [draft, setDraft] = useLocalStorageState(
    "english-shadow-coach.draft",
    "",
  );
  const [chatPending, setChatPending] = useState(false);
  const [coachPending, setCoachPending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelsSource, setModelsSource] = useState<"user" | "public" | null>(
    null,
  );
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [speechPendingIds, setSpeechPendingIds] = useState<string[]>([]);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const audioUrlsRef = useRef(new Map<string, string>());
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const activeSession =
    sessions.find((session) => session.id === currentSessionId) ??
    sessions[0] ??
    null;
  const activeSessionId = activeSession?.id ?? null;
  const messages = activeSession?.messages ?? EMPTY_MESSAGES;
  const feedback = activeSession?.feedback ?? EMPTY_FEEDBACK;
  const scenario = activeSession?.scenario ?? "";
  const speechEnabled = Boolean(activeSession?.speechEnabled);
  const hideAssistantText = Boolean(activeSession?.hideAssistantText);

  const loadPublicModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);

    try {
      const result = await fetchOpenRouterModelsFromBrowser("");

      setModels(result.models);
      setModelsSource(result.source);
    } catch (error) {
      setModelsError(
        error instanceof Error
          ? error.message
          : "Failed to load OpenRouter models.",
      );
    } finally {
      setModelsLoading(false);
    }
  }, []);

  const refreshModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);

    try {
      const result = await fetchOpenRouterModelsFromBrowser(
        effectiveSettings.openRouterApiKey,
      );

      setModels(result.models);
      setModelsSource(result.source);
      setModelsError("warning" in result ? result.warning ?? null : null);
    } catch (error) {
      setModelsError(
        error instanceof Error
          ? error.message
          : "Failed to load OpenRouter models.",
      );
    } finally {
      setModelsLoading(false);
    }
  }, [effectiveSettings.openRouterApiKey]);

  useEffect(() => {
    if (!sessionsHydrated || !currentSessionHydrated) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      if (sessions.length === 0) {
        const legacyMessages = readStoredArray<ChatMessage>(
          LEGACY_MESSAGE_STORAGE_KEY,
        );
        const legacyFeedback = readStoredArray<CoachFeedback>(
          LEGACY_FEEDBACK_STORAGE_KEY,
        );

        if (legacyMessages.length > 0 || legacyFeedback.length > 0) {
          const migratedSession = createSession({
            messages: legacyMessages,
            feedback: legacyFeedback,
          });

          setSessions([migratedSession]);
          setCurrentSessionId(migratedSession.id);
          window.localStorage.removeItem(LEGACY_MESSAGE_STORAGE_KEY);
          window.localStorage.removeItem(LEGACY_FEEDBACK_STORAGE_KEY);
        }

        return;
      }

      if (
        !currentSessionId ||
        !sessions.some((session) => session.id === currentSessionId)
      ) {
        setCurrentSessionId(sessions[0]?.id ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    currentSessionHydrated,
    currentSessionId,
    sessions,
    sessionsHydrated,
    setCurrentSessionId,
    setSessions,
  ]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void loadPublicModels();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadPublicModels]);

  useEffect(() => {
    const audioUrls = audioUrlsRef.current;

    return () => {
      audioUrls.forEach((audioUrl) => {
        URL.revokeObjectURL(audioUrl);
      });
      audioUrls.clear();
    };
  }, []);

  const updateSession = useCallback(
    (
      sessionId: string,
      patch: Partial<
        Pick<
          ConversationSession,
          | "messages"
          | "feedback"
          | "scenario"
          | "speechEnabled"
          | "hideAssistantText"
        >
      >,
    ) => {
      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId ? applySessionPatch(session, patch) : session,
        ),
      );
    },
    [setSessions],
  );

  const playAssistantMessageAudio = useCallback(
    async (message: ChatMessage) => {
      if (message.role !== "assistant") {
        return;
      }

      if (!effectiveSettings.openRouterApiKey.trim()) {
        const errorMessage = "Add your OpenRouter API key in Settings first.";

        setSpeechError(errorMessage);
        setSettingsOpen(true);
        return;
      }

      const cacheKey = getAssistantAudioCacheKey({
        messageId: message.id,
        model: effectiveSettings.ttsModel,
        voice: effectiveSettings.ttsVoice,
      });

      setSpeechError(null);
      setSpeechPendingIds((current) =>
        current.includes(message.id) ? current : [...current, message.id],
      );

      try {
        let audioUrl = audioUrlsRef.current.get(cacheKey);

        if (!audioUrl) {
          let audioBlob = await getCachedAudioBlob(cacheKey);

          if (!audioBlob) {
            audioBlob = await callOpenRouterSpeechFromBrowser({
              apiKey: effectiveSettings.openRouterApiKey,
              model: effectiveSettings.ttsModel,
              voice: effectiveSettings.ttsVoice,
              input: message.content,
              instructions:
                "Speak in clear, natural conversational English with a warm, realistic tone. Keep the delivery easy to follow for language practice.",
            });
            void putCachedAudioBlob(cacheKey, audioBlob);
          }

          audioUrl = URL.createObjectURL(audioBlob);
          audioUrlsRef.current.set(cacheKey, audioUrl);
        }

        audioPlayerRef.current?.pause();

        const player = new Audio(audioUrl);
        audioPlayerRef.current = player;
        player.onended = () => {
          setPlayingMessageId((current) =>
            current === message.id ? null : current,
          );
        };
        player.onerror = () => {
          setPlayingMessageId((current) =>
            current === message.id ? null : current,
          );
          setSpeechError("Audio playback failed.");
        };

        setPlayingMessageId(message.id);
        await player.play();
      } catch (error) {
        setPlayingMessageId((current) =>
          current === message.id ? null : current,
        );
        setSpeechError(
          error instanceof Error ? error.message : "Audio playback failed.",
        );
      } finally {
        setSpeechPendingIds((current) =>
          current.filter((messageId) => messageId !== message.id),
        );
      }
    },
    [
      effectiveSettings.openRouterApiKey,
      effectiveSettings.ttsModel,
      effectiveSettings.ttsVoice,
    ],
  );

  const runChatPartner = useCallback(
    async (
      sessionId: string,
      conversation: ChatMessage[],
      conversationScenario: string,
      conversationSpeechEnabled: boolean,
    ) => {
      setChatPending(true);
      setChatError(null);

      try {
        const content = await callOpenRouterFromBrowser({
          apiKey: effectiveSettings.openRouterApiKey,
          model: effectiveSettings.chatModel,
          temperature: 0.75,
          messages: [
            {
              role: "system",
              content: buildChatSystemPrompt(
                conversationScenario,
                conversationSpeechEnabled,
              ),
            },
            ...conversation
              .slice(-24)
              .map(({ role, content }) => ({ role, content })),
          ],
        });
        const assistantMessage: ChatMessage = {
          id: makeId(),
          role: "assistant",
          content,
          createdAt: new Date().toISOString(),
        };

        setSessions((current) =>
          current.map((session) =>
            session.id === sessionId
              ? applySessionPatch(session, {
                  messages: [...session.messages, assistantMessage],
                })
              : session,
          ),
        );

        if (conversationSpeechEnabled) {
          void playAssistantMessageAudio(assistantMessage);
        }
      } catch (error) {
        setChatError(
          error instanceof Error ? error.message : "Chat Partner request failed.",
        );
      } finally {
        setChatPending(false);
      }
    },
    [
      effectiveSettings.chatModel,
      effectiveSettings.openRouterApiKey,
      playAssistantMessageAudio,
      setSessions,
    ],
  );

  const runSilentCoach = useCallback(
    async (
      sessionId: string,
      conversation: ChatMessage[],
      latestUserMessage: ChatMessage,
      conversationScenario: string,
      conversationSpeechEnabled: boolean,
    ) => {
      setCoachPending(true);
      setCoachError(null);

      try {
        const context = pickCoachContext({
          messages: conversation,
          mode: effectiveSettings.contextMode,
          recentTurns: effectiveSettings.recentTurns,
        });
        const contextText = context
          .map((message) => {
            const speaker = message.role === "user" ? "User" : "Chat Partner";
            return `${speaker}: ${message.content}`;
          })
          .join("\n\n");
        const raw = await callOpenRouterFromBrowser({
          apiKey: effectiveSettings.openRouterApiKey,
          model: effectiveSettings.coachModel,
          temperature: 0.2,
          responseFormat: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: buildCoachSystemPrompt(conversationSpeechEnabled),
            },
            {
              role: "user",
              content: `
Scenario:
${conversationScenario.trim() || "None"}

Speech mode: ${conversationSpeechEnabled ? "enabled" : "disabled"}
Context mode: ${effectiveSettings.contextMode}
Explanation language: ${getExplanationLanguageName(effectiveSettings.explanationLanguage)}
Write explanation, issues, and reusable pattern in the requested explanation language.
Analyze only this latest user sentence:
${latestUserMessage.content}

Conversation context:
${contextText}
`.trim(),
            },
          ],
        });
        const result = normalizeCoachResponse(raw, latestUserMessage.id);
        const coachFeedback: CoachFeedback = {
          ...result,
          id: makeId(),
          createdAt: new Date().toISOString(),
        };

        setSessions((current) =>
          current.map((session) =>
            session.id === sessionId
              ? applySessionPatch(session, {
                  feedback: [coachFeedback, ...session.feedback].slice(0, 80),
                })
              : session,
          ),
        );
      } catch (error) {
        setCoachError(
          error instanceof Error ? error.message : "Silent Coach request failed.",
        );
      } finally {
        setCoachPending(false);
      }
    },
    [
      effectiveSettings.coachModel,
      effectiveSettings.contextMode,
      effectiveSettings.explanationLanguage,
      effectiveSettings.openRouterApiKey,
      effectiveSettings.recentTurns,
      setSessions,
    ],
  );

  const handleSend = useCallback(() => {
    const content = draft.trim();

    if (!content || chatPending) {
      return;
    }

    if (!effectiveSettings.openRouterApiKey.trim()) {
      const message = "Add your OpenRouter API key in Settings before sending.";

      setChatError(message);
      setCoachError(message);
      setSettingsOpen(true);
      return;
    }

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const sessionId = activeSessionId ?? makeId();
    const conversation = [...messages, userMessage];

    setDraft("");
    setChatError(null);
    setCoachError(null);

    if (activeSessionId) {
      updateSession(sessionId, { messages: conversation });
    } else {
      setSessions((current) => [
        createSession({ id: sessionId, messages: conversation }),
        ...current,
      ]);
      setCurrentSessionId(sessionId);
    }

    void runChatPartner(sessionId, conversation, scenario, speechEnabled);
    void runSilentCoach(
      sessionId,
      conversation,
      userMessage,
      scenario,
      speechEnabled,
    );
  }, [
    activeSessionId,
    chatPending,
    draft,
    effectiveSettings.openRouterApiKey,
    messages,
    runChatPartner,
    runSilentCoach,
    scenario,
    speechEnabled,
    setCurrentSessionId,
    setDraft,
    setSessions,
    updateSession,
  ]);

  const handleNewSession = useCallback(() => {
    if (
      activeSession &&
      activeSession.messages.length === 0 &&
      activeSession.feedback.length === 0
    ) {
      setCurrentSessionId(activeSession.id);
      setDraft("");
      setChatError(null);
      setCoachError(null);
      return;
    }

    const session = createSession();

    setSessions((current) => [session, ...current]);
    setCurrentSessionId(session.id);
    setDraft("");
    setChatError(null);
    setCoachError(null);
  }, [
    activeSession,
    setCurrentSessionId,
    setDraft,
    setSessions,
  ]);

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      const sessionToDelete = sessions.find((session) => session.id === sessionId);
      const nextSessions = sessions.filter((session) => session.id !== sessionId);

      setSessions(nextSessions);
      sessionToDelete?.messages
        .filter((message) => message.role === "assistant")
        .forEach((message) => {
          void deleteCachedAudioBlob(
            getAssistantAudioCacheKey({
              messageId: message.id,
              model: effectiveSettings.ttsModel,
              voice: effectiveSettings.ttsVoice,
            }),
          );
        });

      if (sessionId === activeSessionId) {
        setCurrentSessionId(nextSessions[0]?.id ?? null);
        setDraft("");
        setChatError(null);
        setCoachError(null);
      }
    },
    [
      activeSessionId,
      effectiveSettings.ttsModel,
      effectiveSettings.ttsVoice,
      sessions,
      setCurrentSessionId,
      setDraft,
      setSessions,
    ],
  );

  const handleRenameSession = useCallback(
    (sessionId: string, title: string) => {
      setSessions((current) =>
        current.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                title,
                titleEdited: true,
                updatedAt: new Date().toISOString(),
              }
            : session,
        ),
      );
    },
    [setSessions],
  );

  const handleScenarioChange = useCallback(
    (nextScenario: string) => {
      const scenarioText = nextScenario.trim();

      if (activeSessionId) {
        updateSession(activeSessionId, { scenario: scenarioText });
        return;
      }

      const session = createSession();
      session.scenario = scenarioText;
      setSessions((current) => [session, ...current]);
      setCurrentSessionId(session.id);
    },
    [activeSessionId, setCurrentSessionId, setSessions, updateSession],
  );

  const handleSpeechEnabledChange = useCallback(
    (enabled: boolean) => {
      setSpeechError(null);

      if (activeSessionId) {
        updateSession(activeSessionId, { speechEnabled: enabled });
        return;
      }

      const session = createSession();
      session.speechEnabled = enabled;
      setSessions((current) => [session, ...current]);
      setCurrentSessionId(session.id);
    },
    [activeSessionId, setCurrentSessionId, setSessions, updateSession],
  );

  const handleHideAssistantTextChange = useCallback(
    (hidden: boolean) => {
      if (activeSessionId) {
        updateSession(activeSessionId, { hideAssistantText: hidden });
        return;
      }

      const session = createSession();
      session.hideAssistantText = hidden;
      setSessions((current) => [session, ...current]);
      setCurrentSessionId(session.id);
    },
    [activeSessionId, setCurrentSessionId, setSessions, updateSession],
  );

  const hasApiKey = Boolean(effectiveSettings.openRouterApiKey.trim());

  return (
    <main className="flex h-dvh min-h-[720px] flex-col overflow-hidden px-4 py-4 text-zinc-950">
      <header className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 pb-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-lg shadow-zinc-900/10">
              <Bot className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-normal text-zinc-950">
                English Shadow Coach
              </h1>
              <p className="truncate text-sm text-zinc-500">
                Chat naturally. Improve quietly.
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className={`hidden h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition sm:inline-flex ${
              hasApiKey
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/25 bg-amber-400/15 text-amber-800"
            }`}
            type="button"
            onClick={() => setSettingsOpen(true)}
            title="Open settings"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            {hasApiKey ? "Key saved" : "Add key"}
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 bg-white/75 px-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-zinc-900/10"
            type="button"
            onClick={handleNewSession}
          >
            <Plus className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/15"
            type="button"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 overflow-hidden rounded-lg border border-black/10 bg-white/35 shadow-xl shadow-zinc-900/5 backdrop-blur-xl lg:grid-cols-[280px_minmax(0,1fr)_410px]">
        <HistoryPanel
          sessions={sessions}
          currentSessionId={activeSessionId}
          onSelectSession={setCurrentSessionId}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
        />
        <ChatPanel
          messages={messages}
          scenario={scenario}
          scenarioPresets={effectiveScenarioPresets}
          speechEnabled={speechEnabled}
          hideAssistantText={hideAssistantText}
          speechPendingIds={speechPendingIds}
          playingMessageId={playingMessageId}
          value={draft}
          error={chatError ?? speechError}
          isPending={chatPending}
          onScenarioChange={handleScenarioChange}
          onScenarioPresetsChange={setScenarioPresets}
          onSpeechEnabledChange={handleSpeechEnabledChange}
          onHideAssistantTextChange={handleHideAssistantTextChange}
          onPlayAssistantMessage={playAssistantMessageAudio}
          onValueChange={setDraft}
          onSubmit={handleSend}
        />
        <CoachPanel
          feedback={feedback}
          error={coachError}
          isPending={coachPending}
        />
      </div>

      <SettingsPanel
        open={settingsOpen}
        settings={effectiveSettings}
        models={models}
        modelsLoading={modelsLoading}
        modelsError={modelsError}
        modelsSource={modelsSource}
        onChange={setSettings}
        onRefreshModels={refreshModels}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
