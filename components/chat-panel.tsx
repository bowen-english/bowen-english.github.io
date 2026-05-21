"use client";

import {
  FormEvent,
  KeyboardEvent,
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

type ChatPanelProps = {
  messages: ChatMessage[];
  scenario: string;
  scenarioPresets: ScenarioPreset[];
  speechEnabled: boolean;
  hideAssistantText: boolean;
  speechPendingIds: string[];
  playingMessageId: string | null;
  value: string;
  error: string | null;
  isPending: boolean;
  canEditMessages: boolean;
  editRequest: MessageEditRequest | null;
  onScenarioChange: (scenario: string) => void;
  onScenarioPresetsChange: (presets: ScenarioPreset[]) => void;
  onSpeechEnabledChange: (enabled: boolean) => void;
  onHideAssistantTextChange: (hidden: boolean) => void;
  onPlayAssistantMessage: (message: ChatMessage) => void;
  onEditUserMessage: (messageId: string, content: string) => boolean;
  onEditRequestComplete: (request: MessageEditRequest) => void;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatPanel({
  messages,
  scenario,
  scenarioPresets,
  speechEnabled,
  hideAssistantText,
  speechPendingIds,
  playingMessageId,
  value,
  error,
  isPending,
  canEditMessages,
  editRequest,
  onScenarioChange,
  onScenarioPresetsChange,
  onSpeechEnabledChange,
  onHideAssistantTextChange,
  onPlayAssistantMessage,
  onEditUserMessage,
  onEditRequestComplete,
  onValueChange,
  onSubmit,
}: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isPending]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing || event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <section className="relative isolate flex min-h-0 flex-col border-stone-900/10 bg-[#fffdf8]/40 lg:border-r">
      <div className="relative z-40 flex items-center justify-between border-b border-stone-900/10 bg-[#fffdf8]/60 px-4 py-3 backdrop-blur">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#26231f]">
            Chat Partner
          </h2>
          <p className="mt-1 line-clamp-1 text-sm text-stone-500">
            {scenario.trim() || "Natural English conversation"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            <div className="animate-gentle-pop inline-flex items-center gap-2 rounded-full border border-[#0f6f68]/15 bg-[#eef6f3] px-3 py-1 text-xs font-semibold text-[#0f6f68] shadow-sm shadow-stone-900/[0.03]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              thinking
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative z-0 min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <div className="animate-soft-rise max-w-sm text-center">
              <div className="shine-sweep mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-[#2f3733] text-white shadow-lg shadow-stone-900/10">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <p className="text-2xl font-semibold tracking-normal text-[#26231f]">
                Ready when you are.
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                Start with anything you would naturally say in English.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
            {isPending ? (
              <article className="animate-gentle-pop flex gap-3">
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0f6f68] text-white shadow-sm shadow-[#0f6f68]/15">
                  <Sparkles className="size-4" aria-hidden="true" />
                </div>
                <div className="rounded-lg border border-stone-900/10 bg-[#fffdf8]/80 px-4 py-3 text-sm text-stone-500 shadow-sm shadow-stone-900/[0.04] backdrop-blur">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="typing-dot block size-1.5 rounded-full bg-[#0f6f68]" />
                    <span className="typing-dot block size-1.5 rounded-full bg-[#0f6f68]" />
                    <span className="typing-dot block size-1.5 rounded-full bg-[#0f6f68]" />
                  </span>
                </div>
              </article>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error ? (
        <div className="animate-gentle-pop mx-4 mb-3 rounded-lg border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm text-rose-700 shadow-sm shadow-rose-900/5">
          {error}
        </div>
      ) : null}

      <form
        className="border-t border-stone-900/10 bg-[#fffdf8]/80 p-3 backdrop-blur-xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-end gap-2 rounded-lg border border-stone-900/10 bg-[#fffdf8]/95 p-2 shadow-sm shadow-stone-900/[0.04] transition-all duration-200 focus-within:border-[#0f6f68]/35 focus-within:shadow-lg focus-within:shadow-[#0f6f68]/10 focus-within:ring-4 focus-within:ring-[#0f6f68]/10">
          <textarea
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-[#26231f] outline-none placeholder:text-stone-400"
            value={value}
            rows={1}
            onChange={(event) => onValueChange(event.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={handleKeyDown}
            placeholder="Type in English..."
          />
          <button
            className="shine-sweep flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#0f6f68] text-white shadow-sm shadow-[#0f6f68]/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0b5f59] hover:shadow-md focus:outline-none focus:ring-4 focus:ring-[#0f6f68]/20 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
            type="submit"
            disabled={!value.trim() || isPending}
            title="Send"
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
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
      className={`flex size-8 items-center justify-center rounded-lg border shadow-sm transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 ${
        active
          ? "border-[#0f6f68]/25 bg-[#eef6f3] text-[#0f6f68] shadow-stone-900/[0.03] focus:ring-[#0f6f68]/15"
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

function MessageBubble({
  message,
  hideAssistantText,
  isSpeechPending,
  isPlaying,
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
      className={`group flex animate-gentle-pop gap-3 ${
        message.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      {isAssistant ? (
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0f6f68] text-white shadow-sm shadow-[#0f6f68]/15">
          <Sparkles className="size-4" aria-hidden="true" />
        </div>
      ) : null}
      <div
        className={`relative max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm transition-all duration-200 ${
          isPracticeTarget ? "ring-4 ring-[#0f6f68]/20" : ""
        } ${
          message.role === "user"
            ? isEditing
              ? "border border-[#0f6f68]/25 bg-[#fffdf8] text-[#26231f] shadow-stone-900/[0.06] group-hover:-translate-y-0.5 group-hover:shadow-md"
              : "bg-[#2f3733] text-white shadow-stone-900/10 group-hover:-translate-y-0.5 group-hover:shadow-md"
            : "border border-stone-900/10 bg-[#fffdf8]/80 pr-11 text-stone-800 shadow-stone-900/[0.04] backdrop-blur group-hover:-translate-y-0.5 group-hover:bg-[#fffdf8]/95 group-hover:shadow-md"
        }`}
      >
        {isEditing ? (
          <div className="animate-soft-rise w-[min(32rem,64vw)] max-w-full">
            <textarea
              ref={editRef}
              className="max-h-40 min-h-24 w-full resize-y rounded-md border border-stone-900/10 bg-white px-3 py-2 text-sm leading-6 text-[#26231f] outline-none transition-all duration-200 placeholder:text-stone-400 focus:border-[#0f6f68]/45 focus:ring-4 focus:ring-[#0f6f68]/10"
              value={draft}
              rows={3}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleEditKeyDown}
            />
            <div className="mt-2 flex justify-end gap-1.5">
              <button
                className="flex size-8 items-center justify-center rounded-lg border border-stone-900/10 bg-white text-stone-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-stone-50 hover:text-[#26231f] focus:outline-none focus:ring-4 focus:ring-stone-900/10"
                type="button"
                onClick={cancelEdit}
                title="Cancel edit"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
              <button
                className="flex size-8 items-center justify-center rounded-lg bg-[#0f6f68] text-white shadow-sm shadow-[#0f6f68]/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0b5f59] focus:outline-none focus:ring-4 focus:ring-[#0f6f68]/20 disabled:cursor-not-allowed disabled:opacity-45"
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
            className={`whitespace-pre-wrap break-words ${
              isAssistant && hideAssistantText
                ? "select-none text-transparent [text-shadow:0_0_10px_rgba(63,63,70,0.55)]"
                : ""
            }`}
          >
            {message.content}
          </p>
        )}
        {!isAssistant && canEdit && !isEditing ? (
          <button
            className="absolute -left-9 top-2 flex size-7 translate-x-1 scale-95 items-center justify-center rounded-lg border border-stone-900/10 bg-white/85 text-stone-500 opacity-0 shadow-sm shadow-stone-900/10 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-stone-950 focus:translate-x-0 focus:scale-100 focus:opacity-100 focus:outline-none focus:ring-4 focus:ring-stone-900/10 group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100"
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
        {isAssistant ? (
          <button
            className={`absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-4 ${
              isPlaying
                ? "border-[#0f6f68]/25 bg-[#eef6f3] text-[#0f6f68] focus:ring-[#0f6f68]/15"
                : "border-stone-900/10 bg-[#fffdf8]/80 text-stone-500 hover:bg-[#fffdf8] hover:text-[#26231f] focus:ring-stone-900/10"
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
        <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#7b6a5e] text-white shadow-sm shadow-stone-900/10">
          <UserRound className="size-4" aria-hidden="true" />
        </div>
      ) : null}
    </article>
  );
}
