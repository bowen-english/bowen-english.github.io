"use client";

import {
  FormEvent,
  KeyboardEvent,
  memo,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Send,
  Sparkles,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { ChatMessage, MessageEditRequest, ScenarioPreset } from "@/lib/types";
import { ScenarioControl } from "@/components/scenario-control";
import { reportLocalStorageFailure } from "@/hooks/use-local-storage-state";

type ChatPanelProps = {
  sessionId: string | null;
  messages: ChatMessage[];
  streamingMessage: ChatMessage | null;
  scenario: string;
  scenarioPresets: ScenarioPreset[];
  speechEnabled: boolean;
  conversationVoice: string | null;
  hideAssistantText: boolean;
  speechPendingIds: string[];
  playingMessageId: string | null;
  error: string | null;
  isPending: boolean;
  canSend: boolean;
  canEditMessages: boolean;
  editRequest: MessageEditRequest | null;
  onScenarioChange: (scenario: string) => void;
  onScenarioPresetsChange: (presets: ScenarioPreset[]) => void;
  onSpeechEnabledChange: (enabled: boolean) => void;
  onHideAssistantTextChange: (hidden: boolean) => void;
  onPlayAssistantMessage: (message: ChatMessage) => void;
  onEditUserMessage: (messageId: string, content: string) => boolean;
  onEditRequestComplete: (request: MessageEditRequest) => void;
  onSubmit: (value: string) => boolean;
};

const DRAFT_STORAGE_PREFIX = "english-shadow-coach.draft.v2";
const LEGACY_DRAFT_STORAGE_KEY = "english-shadow-coach.draft";

function persistDraft(storageKey: string, value: string) {
  try {
    if (value) {
      window.localStorage.setItem(storageKey, value);
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    reportLocalStorageFailure(storageKey, value ? "write" : "remove");
  }
}

export const ChatPanel = memo(function ChatPanel({
  sessionId,
  messages,
  streamingMessage,
  scenario,
  scenarioPresets,
  speechEnabled,
  conversationVoice,
  hideAssistantText,
  speechPendingIds,
  playingMessageId,
  error,
  isPending,
  canSend,
  canEditMessages,
  editRequest,
  onScenarioChange,
  onScenarioPresetsChange,
  onSpeechEnabledChange,
  onHideAssistantTextChange,
  onPlayAssistantMessage,
  onEditUserMessage,
  onEditRequestComplete,
  onSubmit,
}: ChatPanelProps) {
  const streamRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(messages.length);
  const previousLastMessageIdRef = useRef<string | null>(null);
  const lastMessageId = streamingMessage?.id ?? messages.at(-1)?.id ?? null;
  const streamingContentLength = streamingMessage?.content.length ?? 0;

  useEffect(() => {
    const stream = streamRef.current;
    const previousMessageCount = previousMessageCountRef.current;
    const isNewMessage = previousLastMessageIdRef.current !== lastMessageId;
    const shouldAnimate =
      previousMessageCount > 0 && messages.length > previousMessageCount;

    previousMessageCountRef.current = messages.length;
    previousLastMessageIdRef.current = lastMessageId;

    if (!stream) {
      return;
    }

    const distanceFromBottom =
      stream.scrollHeight - stream.scrollTop - stream.clientHeight;

    if (!isNewMessage && distanceFromBottom > 160) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      stream.scrollTo({
        top: stream.scrollHeight,
        behavior: shouldAnimate && !reduceMotion ? "smooth" : "auto",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isPending, lastMessageId, messages.length, streamingContentLength]);

  return (
    <section className="chat-panel relative isolate flex h-full min-h-0 flex-col lg:border-r">
      <div className="panel-header chat-panel-header relative z-40 flex items-center justify-between gap-3 px-3 py-2.5 backdrop-blur sm:px-5 sm:py-3.5">
        <div className="min-w-0">
          <h2 className="panel-title text-sm font-extrabold tracking-[-0.01em] text-[#201d35]">
            Chat Partner
          </h2>
          <p className="mt-1 line-clamp-1 text-sm text-[#827d98]">
            {scenario.trim() || "Natural English conversation"}
            <span className="text-[#6558f5]">
              {conversationVoice
                ? ` · Voice: ${conversationVoice}`
                : " · Voice: auto on first play"}
            </span>
          </p>
        </div>
        <div className="flex max-w-[68%] shrink-0 flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:gap-2">
          <IconToggle
            active={speechEnabled}
            title={speechEnabled ? "Speech mode on" : "Speech mode off"}
            onClick={() => onSpeechEnabledChange(!speechEnabled)}
          >
            {speechEnabled ? (
              <Volume2 className="size-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="size-3.5" aria-hidden="true" />
            )}
          </IconToggle>
          <IconToggle
            active={hideAssistantText}
            title={hideAssistantText ? "Reveal replies" : "Hide replies"}
            onClick={() => onHideAssistantTextChange(!hideAssistantText)}
          >
            {hideAssistantText ? (
              <EyeOff className="size-3.5" aria-hidden="true" />
            ) : (
              <Eye className="size-3.5" aria-hidden="true" />
            )}
          </IconToggle>
          <ScenarioControl
            scenario={scenario}
            presets={scenarioPresets}
            onChange={onScenarioChange}
            onPresetsChange={onScenarioPresetsChange}
          />
          {isPending ? (
            <div className="animate-gentle-pop inline-flex items-center gap-2 rounded-full border border-[#6558f5]/15 bg-[#eeecff] px-3 py-1 text-xs font-semibold text-[#6558f5] shadow-sm shadow-stone-900/[0.03]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              <span className="hidden sm:inline">thinking</span>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={streamRef}
        className="chat-stream relative z-0 min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5 sm:py-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <div className="animate-soft-rise max-w-sm text-center">
              <div className="empty-state-mark shine-sweep mx-auto mb-5 flex size-14 items-center justify-center text-white">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <p className="text-xl font-bold tracking-[-0.025em] text-[#201d35] sm:text-2xl">
                Ready when you are.
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                Start with anything you would naturally say in English.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                hideAssistantText={hideAssistantText}
                isSpeechPending={speechPendingIds.includes(message.id)}
                isPlaying={playingMessageId === message.id}
                canEdit={canEditMessages}
                editRequest={editRequest}
                onPlayAssistantMessage={onPlayAssistantMessage}
                onEditUserMessage={onEditUserMessage}
                onEditRequestComplete={onEditRequestComplete}
              />
            ))}
            {streamingMessage ? (
              <MessageBubble
                message={streamingMessage}
                hideAssistantText={hideAssistantText}
                isSpeechPending={false}
                isPlaying={false}
                isStreaming
                canEdit={false}
                editRequest={null}
                onPlayAssistantMessage={onPlayAssistantMessage}
                onEditUserMessage={onEditUserMessage}
                onEditRequestComplete={onEditRequestComplete}
              />
            ) : isPending ? (
              <article className="animate-gentle-pop flex gap-3">
                <div className="assistant-avatar mt-1 flex size-8 shrink-0 items-center justify-center text-white">
                  <Sparkles className="size-4" aria-hidden="true" />
                </div>
                <div className="rounded-lg border border-stone-900/10 bg-[#fffdf8]/80 px-4 py-3 text-sm text-stone-500 shadow-sm shadow-stone-900/[0.04] backdrop-blur">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="typing-dot block size-1.5 rounded-full bg-[#6558f5]" />
                    <span className="typing-dot block size-1.5 rounded-full bg-[#6558f5]" />
                    <span className="typing-dot block size-1.5 rounded-full bg-[#6558f5]" />
                  </span>
                </div>
              </article>
            ) : null}
            <div aria-hidden="true" />
          </div>
        )}
      </div>

      {error ? (
        <div className="animate-gentle-pop mx-4 mb-3 rounded-lg border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm text-rose-700 shadow-sm shadow-rose-900/5">
          {error}
        </div>
      ) : null}

      <ChatComposer
        key={sessionId ?? "new"}
        sessionId={sessionId}
        canSend={canSend}
        onSubmit={onSubmit}
      />
    </section>
  );
});

function ChatComposer({
  sessionId,
  canSend,
  onSubmit,
}: {
  sessionId: string | null;
  canSend: boolean;
  onSubmit: (value: string) => boolean;
}) {
  const storageKey = `${DRAFT_STORAGE_PREFIX}:${sessionId ?? "new"}`;
  const loadedKeyRef = useRef<string | null>(null);
  const latestDraftRef = useRef({ storageKey, value: "" });
  const [value, setValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    latestDraftRef.current = { storageKey, value };
  }, [storageKey, value]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      let stored = "";

      try {
        stored = window.localStorage.getItem(storageKey) ?? "";

        if (!stored) {
          const legacyDraft =
            window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY) ?? "";

          if (legacyDraft) {
            try {
              const parsedDraft = JSON.parse(legacyDraft) as unknown;
              stored =
                typeof parsedDraft === "string" ? parsedDraft : legacyDraft;
            } catch {
              stored = legacyDraft;
            }
          }

          if (legacyDraft) {
            window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
          }
        }
      } catch {
        reportLocalStorageFailure(storageKey, "read");
      }

      loadedKeyRef.current = storageKey;
      setValue(stored);
    });

    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  useEffect(() => {
    if (loadedKeyRef.current !== storageKey) {
      return;
    }

    const timer = window.setTimeout(() => {
      persistDraft(storageKey, value);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [storageKey, value]);

  useEffect(() => {
    return () => {
      const latest = latestDraftRef.current;

      if (loadedKeyRef.current === latest.storageKey) {
        persistDraft(latest.storageKey, latest.value);
      }
    };
  }, []);

  const submit = () => {
    if (!canSend || !value.trim()) {
      return;
    }

    if (onSubmit(value)) {
      latestDraftRef.current = { storageKey, value: "" };
      setValue("");
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        reportLocalStorageFailure(storageKey, "remove");
      }
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing || event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="chat-composer p-2.5 backdrop-blur-xl sm:p-4"
      onSubmit={handleSubmit}
    >
      <div className="composer-shell smooth-transition flex items-end gap-2 p-2">
        <textarea
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-[#201d35] outline-none placeholder:text-stone-400"
          value={value}
          rows={1}
          aria-label="English message"
          onChange={(event) => setValue(event.target.value)}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={handleKeyDown}
          placeholder="Type in English..."
        />
        <button
          className="primary-icon-button shine-sweep smooth-transition flex size-11 shrink-0 items-center justify-center text-white hover:-translate-y-0.5 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          type="submit"
          disabled={!value.trim() || !canSend}
          title="Send"
        >
          <Send className="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}

function IconToggle({
  active,
  title,
  children,
  onClick,
}: {
  active: boolean;
  title: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`smooth-transition flex size-9 items-center justify-center rounded-lg border shadow-sm hover:-translate-y-0.5 focus:outline-none focus:ring-4 sm:size-8 ${
        active
          ? "border-[#6558f5]/25 bg-[#eeecff] text-[#6558f5] shadow-stone-900/[0.03] focus:ring-[#6558f5]/15"
          : "border-stone-900/10 bg-[#fffdf8]/70 text-stone-600 hover:bg-[#fffdf8] focus:ring-stone-900/10"
      }`}
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  hideAssistantText,
  isSpeechPending,
  isPlaying,
  isStreaming = false,
  canEdit,
  editRequest,
  onPlayAssistantMessage,
  onEditUserMessage,
  onEditRequestComplete,
}: {
  message: ChatMessage;
  hideAssistantText: boolean;
  isSpeechPending: boolean;
  isPlaying: boolean;
  isStreaming?: boolean;
  canEdit: boolean;
  editRequest: MessageEditRequest | null;
  onPlayAssistantMessage: (message: ChatMessage) => void;
  onEditUserMessage: (messageId: string, content: string) => boolean;
  onEditRequestComplete: (request: MessageEditRequest) => void;
}) {
  const isAssistant = message.role === "assistant";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const bubbleRef = useRef<HTMLElement | null>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const handledEditRequestRef = useRef<number | null>(null);
  const selectAllOnFocusRef = useRef(false);
  const isPracticeTarget = !isAssistant && editRequest?.messageId === message.id;

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const textarea = editRef.current;

    textarea?.focus();
    if (selectAllOnFocusRef.current) {
      textarea?.select();
      selectAllOnFocusRef.current = false;
    } else {
      textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, [isEditing]);

  useEffect(() => {
    if (
      isAssistant ||
      !editRequest ||
      editRequest.messageId !== message.id ||
      handledEditRequestRef.current === editRequest.requestId
    ) {
      return;
    }

    let cancelled = false;

    handledEditRequestRef.current = editRequest.requestId;
    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      selectAllOnFocusRef.current = true;
      setDraft(editRequest.draft);
      setIsEditing(true);
      bubbleRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [editRequest, isAssistant, message.id]);

  const saveEdit = () => {
    const content = draft.trim();

    if (!content) {
      return;
    }

    if (content !== message.content) {
      if (onEditUserMessage(message.id, content)) {
        setIsEditing(false);
        if (editRequest?.messageId === message.id) {
          onEditRequestComplete(editRequest);
        }
      }
    } else {
      setIsEditing(false);
      setDraft(message.content);
      if (editRequest?.messageId === message.id) {
        onEditRequestComplete(editRequest);
      }
    }
  };

  const cancelEdit = () => {
    setDraft(message.content);
    setIsEditing(false);
    if (editRequest?.messageId === message.id) {
      onEditRequestComplete(editRequest);
    }
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      saveEdit();
    }
  };

  return (
    <article
      ref={bubbleRef}
      className={`group flex animate-gentle-pop gap-2 sm:gap-3 ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {isAssistant ? (
        <div className="assistant-avatar mt-1 hidden size-8 shrink-0 items-center justify-center text-white sm:flex">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
      ) : null}
      <div
        className={`message-bubble smooth-transition ${isAssistant ? "assistant-bubble" : "user-bubble"} relative max-w-[88%] px-3.5 py-2.5 text-sm leading-6 sm:max-w-[82%] sm:px-4 sm:py-3 ${
          isPracticeTarget ? "ring-4 ring-[#6558f5]/20" : ""
        } ${
          message.role === "user"
            ? isEditing
              ? "border border-[#6558f5]/25 bg-[#fffdf8] text-[#201d35] shadow-stone-900/[0.06] group-hover:-translate-y-0.5 group-hover:shadow-md"
              : "bg-[#201d35] text-white shadow-stone-900/10 group-hover:-translate-y-0.5 group-hover:shadow-md"
            : "border border-stone-900/10 bg-[#fffdf8]/80 pr-14 text-stone-800 shadow-stone-900/[0.04] group-hover:-translate-y-0.5 group-hover:bg-[#fffdf8]/95 group-hover:shadow-md sm:pr-14"
        }`}
      >
        {isEditing ? (
          <div className="animate-soft-rise w-[min(32rem,84vw)] max-w-full sm:w-[min(32rem,64vw)]">
            <textarea
              ref={editRef}
              className="smooth-transition max-h-40 min-h-24 w-full resize-y rounded-md border border-stone-900/10 bg-white px-3 py-2 text-sm leading-6 text-[#201d35] outline-none placeholder:text-stone-400 focus:border-[#6558f5]/45 focus:ring-4 focus:ring-[#6558f5]/10"
              value={draft}
              rows={3}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleEditKeyDown}
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <button
                className="smooth-transition flex size-8 items-center justify-center rounded-lg border border-stone-900/10 bg-white text-stone-500 hover:-translate-y-0.5 hover:bg-stone-50 hover:text-[#201d35] focus:outline-none focus:ring-4 focus:ring-stone-900/10"
                type="button"
                onClick={cancelEdit}
                title="Cancel edit"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
              <button
                className="smooth-transition flex size-8 items-center justify-center rounded-lg bg-[#6558f5] text-white shadow-sm shadow-[#6558f5]/15 hover:-translate-y-0.5 hover:bg-[#5145d9] focus:outline-none focus:ring-4 focus:ring-[#6558f5]/20 disabled:cursor-not-allowed disabled:opacity-45"
                type="button"
                onClick={saveEdit}
                disabled={!draft.trim()}
                title="Save edit"
              >
                <Check className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <p
            aria-live={isStreaming ? "polite" : undefined}
            aria-busy={isStreaming || undefined}
            className={`whitespace-pre-wrap break-words ${
              isAssistant && hideAssistantText
                ? "select-none text-transparent [text-shadow:0_0_10px_rgba(63,63,70,0.55)]"
                : ""
            }`}
          >
            {message.content || isStreaming ? (
              <>
                {message.content}
                {isStreaming ? (
                  <span
                    className="streaming-caret ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.12em] rounded-full bg-[#6558f5]"
                    aria-hidden="true"
                  />
                ) : null}
              </>
            ) : null}
          </p>
        )}
        {!isAssistant && canEdit && !isEditing ? (
          <button
            className="smooth-transition absolute -left-8 top-2 flex size-7 translate-x-0 scale-100 items-center justify-center rounded-lg border border-stone-900/10 bg-white/90 text-stone-500 opacity-100 shadow-sm shadow-stone-900/10 hover:-translate-y-0.5 hover:bg-white hover:text-stone-950 focus:translate-x-0 focus:scale-100 focus:opacity-100 focus:outline-none focus:ring-4 focus:ring-stone-900/10 sm:-left-9 sm:translate-x-1 sm:scale-95 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:scale-100 sm:group-hover:opacity-100"
            type="button"
            onClick={() => {
              selectAllOnFocusRef.current = false;
              setDraft(message.content);
              setIsEditing(true);
            }}
            title="Edit message"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
        {isAssistant && !isStreaming ? (
          <button
            className={`smooth-transition absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg border focus:outline-none focus:ring-4 ${
              isPlaying
                ? "border-[#6558f5]/25 bg-[#eeecff] text-[#6558f5] focus:ring-[#6558f5]/15"
                : "border-stone-900/10 bg-[#fffdf8]/80 text-stone-500 hover:bg-[#fffdf8] hover:text-[#201d35] focus:ring-stone-900/10"
            }`}
            type="button"
            onClick={() => onPlayAssistantMessage(message)}
            disabled={isSpeechPending}
            title={isPlaying ? "Playing" : "Play reply"}
          >
            {isSpeechPending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Volume2 className="size-3.5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
      {message.role === "user" ? (
        <div className="user-avatar mt-1 hidden size-8 shrink-0 items-center justify-center text-white sm:flex">
          <UserRound className="size-4" aria-hidden="true" />
        </div>
      ) : null}
    </article>
  );
});
