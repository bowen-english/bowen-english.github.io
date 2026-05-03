"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles, UserRound } from "lucide-react";
import type { ChatMessage, ScenarioPreset } from "@/lib/types";
import { ScenarioControl } from "@/components/scenario-control";

type ChatPanelProps = {
  messages: ChatMessage[];
  scenario: string;
  scenarioPresets: ScenarioPreset[];
  value: string;
  error: string | null;
  isPending: boolean;
  onScenarioChange: (scenario: string) => void;
  onScenarioPresetsChange: (presets: ScenarioPreset[]) => void;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatPanel({
  messages,
  scenario,
  scenarioPresets,
  value,
  error,
  isPending,
  onScenarioChange,
  onScenarioPresetsChange,
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
    <section className="flex min-h-0 flex-col border-black/10 bg-white/35 lg:border-r">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-950">
            Chat Partner
          </h2>
          <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
            {scenario.trim() || "Natural English conversation"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ScenarioControl
            scenario={scenario}
            presets={scenarioPresets}
            onChange={onScenarioChange}
            onPresetsChange={onScenarioPresetsChange}
          />
          {isPending ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              thinking
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-zinc-950 text-white shadow-lg shadow-zinc-900/10">
                <Sparkles className="size-5" aria-hidden="true" />
              </div>
              <p className="text-2xl font-semibold tracking-normal text-zinc-950">
                Ready when you are.
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Start with anything you would naturally say in English.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                    <Sparkles className="size-4" aria-hidden="true" />
                  </div>
                ) : null}
                <div
                  className={`max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                    message.role === "user"
                      ? "bg-zinc-950 text-white shadow-zinc-900/10"
                      : "border border-black/10 bg-white/75 text-zinc-800"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>
                {message.role === "user" ? (
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white">
                    <UserRound className="size-4" aria-hidden="true" />
                  </div>
                ) : null}
              </article>
            ))}
            {isPending ? (
              <article className="flex gap-3">
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
                  <Sparkles className="size-4" aria-hidden="true" />
                </div>
                <div className="rounded-lg border border-black/10 bg-white/70 px-4 py-3 text-sm text-zinc-500 shadow-sm">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Typing
                  </span>
                </div>
              </article>
            ) : null}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error ? (
        <div className="mx-4 mb-3 rounded-lg border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <form
        className="border-t border-black/10 bg-white/65 p-3 backdrop-blur-xl"
        onSubmit={handleSubmit}
      >
        <div className="flex items-end gap-2 rounded-lg border border-black/10 bg-white p-2 shadow-sm">
          <textarea
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-zinc-950 outline-none placeholder:text-zinc-400"
            value={value}
            rows={1}
            onChange={(event) => onValueChange(event.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={handleKeyDown}
            placeholder="Type in English..."
          />
          <button
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-45"
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
