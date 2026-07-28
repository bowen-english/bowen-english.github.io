"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  COACH_CONTEXT_OPTIONS,
  TTS_VOICE_OPTIONS,
  type CoachContextMode,
  type CoachExplanationLanguage,
  type CoachSettings,
  type OpenRouterModel,
} from "@/lib/types";

type SettingsPanelProps = {
  open: boolean;
  settings: CoachSettings;
  models: OpenRouterModel[];
  modelsLoading: boolean;
  modelsError: string | null;
  modelsSource: "user" | "public" | null;
  onChange: (settings: CoachSettings) => void;
  onRefreshModels: () => void;
  onClose: () => void;
};

export function SettingsPanel({
  open,
  settings,
  models,
  modelsLoading,
  modelsError,
  modelsSource,
  onChange,
  onRefreshModels,
  onClose,
}: SettingsPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const hasKey = Boolean(settings.openRouterApiKey.trim());
  const selectedVoice =
    TTS_VOICE_OPTIONS.find((voice) => voice.value === settings.ttsVoice) ??
    TTS_VOICE_OPTIONS[0];

  const update = (patch: Partial<CoachSettings>) => {
    onChange({ ...settings, ...patch });
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="settings-backdrop fixed inset-0 z-50 flex items-end justify-center px-0 py-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <section className="settings-sheet animate-soft-rise flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[28px] sm:max-h-full sm:rounded-[28px]">
        <header className="settings-header flex items-center justify-between px-5 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shine-sweep flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#201d35] text-white shadow-sm shadow-stone-900/10">
              <SlidersHorizontal className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="settings-title"
                className="truncate text-lg font-bold text-[#201d35]"
              >
                Settings
              </h2>
              <p className="truncate text-sm text-stone-500">
                Saved locally in this browser.
              </p>
            </div>
          </div>
          <button
            className="flex size-10 items-center justify-center rounded-lg text-stone-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-stone-100 hover:text-stone-950 focus:outline-none focus:ring-4 focus:ring-stone-900/10"
            type="button"
            onClick={onClose}
            title="Close settings"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto px-5 py-5">
          <div className="grid gap-5">
            <section className="settings-card rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-stone-600">
                    OpenRouter
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    Your API key stays in localStorage and is never committed.
                  </p>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${
                    hasKey
                      ? "border-[#6558f5]/20 bg-[#eeecff] text-[#6558f5]"
                      : "border-[#9f7a31]/20 bg-[#f7efe0] text-[#7a5d22]"
                  }`}
                >
                  {hasKey ? (
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  ) : (
                    <KeyRound className="size-3.5" aria-hidden="true" />
                  )}
                  {hasKey ? "Key saved" : "Key needed"}
                </span>
              </div>

              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                API Key
              </label>
              <div className="flex h-11 rounded-lg border border-stone-900/10 bg-[#fffdf8] transition-all duration-200 focus-within:border-[#6558f5]/45 focus-within:shadow-md focus-within:shadow-[#6558f5]/10 focus-within:ring-4 focus-within:ring-[#6558f5]/10">
                <input
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm text-stone-900 outline-none placeholder:text-stone-400"
                  value={settings.openRouterApiKey}
                  type={showApiKey ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) =>
                    update({ openRouterApiKey: event.target.value })
                  }
                  placeholder="sk-or-v1-..."
                />
                <button
                  className="flex size-11 shrink-0 items-center justify-center rounded-r-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                  type="button"
                  onClick={() => setShowApiKey((current) => !current)}
                  title={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </section>

            <section className="settings-card grid gap-4 rounded-2xl p-4 sm:grid-cols-2">
              <ModelField
                label="Chat Model"
                value={settings.chatModel}
                models={models}
                listId="chat-model-options"
                placeholder="openai/gpt-5.6-luna"
                onChange={(value) => update({ chatModel: value })}
              />

              <ModelField
                label="Coach Model"
                value={settings.coachModel}
                models={models}
                listId="coach-model-options"
                placeholder="openai/gpt-5.6-luna"
                onChange={(value) => update({ coachModel: value })}
              />

              <div className="sm:col-span-2">
                <button
                  className="shine-sweep inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-stone-900/10 bg-[#201d35] px-3 text-sm font-semibold text-white shadow-sm shadow-stone-900/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#171529] focus:outline-none focus:ring-4 focus:ring-[#6558f5]/15 disabled:cursor-not-allowed disabled:opacity-45"
                  type="button"
                  onClick={onRefreshModels}
                  disabled={modelsLoading}
                >
                  {modelsLoading ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="size-4" aria-hidden="true" />
                  )}
                  Refresh models
                </button>
                <span className="ml-3 text-sm text-stone-500">
                  {modelsLoading
                    ? "Loading OpenRouter models..."
                    : `${models.length} models · ${modelsSource === "user" ? "account list" : "public list"}`}
                </span>
                {modelsError ? (
                  <p className="mt-2 text-sm text-rose-700">{modelsError}</p>
                ) : null}
              </div>
            </section>

            <section className="settings-card grid gap-4 rounded-2xl p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  TTS Model
                </label>
                <input
                  className="h-11 w-full rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 text-sm text-stone-900 outline-none transition-all duration-200 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10"
                  value={settings.ttsModel}
                  onChange={(event) => update({ ttsModel: event.target.value })}
                  placeholder="google/gemini-3.1-flash-tts-preview"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Voice
                </label>
                <select
                  className="h-11 w-full rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 text-sm text-stone-900 outline-none transition-all duration-200 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10"
                  value={settings.ttsVoice}
                  onChange={(event) => update({ ttsVoice: event.target.value })}
                >
                  {TTS_VOICE_OPTIONS.map((voice) => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label} · {voice.tone} · {voice.bestFor}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-lg border border-stone-900/10 bg-stone-50/80 p-3 sm:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-[#201d35]">
                    {selectedVoice.label}
                  </span>
                  <span className="rounded-full border border-[#6558f5]/15 bg-[#eeecff] px-2 py-0.5 text-xs font-bold text-[#6558f5]">
                    {selectedVoice.tone}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-stone-600">
                  {selectedVoice.profile}
                </p>
                <p className="mt-1 text-sm leading-5 text-stone-500">
                  Best for: {selectedVoice.bestFor}
                </p>
              </div>
            </section>

            <section className="settings-card grid gap-4 rounded-2xl p-4 sm:grid-cols-[minmax(0,1fr)_150px_110px]">
              <div className="min-w-0">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Coach Context
                </label>
                <select
                  className="h-11 w-full rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 text-sm text-stone-900 outline-none transition-all duration-200 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10"
                  value={settings.contextMode}
                  onChange={(event) =>
                    update({
                      contextMode: event.target.value as CoachContextMode,
                    })
                  }
                >
                  {COACH_CONTEXT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Explanation
                </label>
                <select
                  className="h-11 w-full rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 text-sm text-stone-900 outline-none transition-all duration-200 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10"
                  value={settings.explanationLanguage}
                  onChange={(event) =>
                    update({
                      explanationLanguage: event.target
                        .value as CoachExplanationLanguage,
                    })
                  }
                >
                  <option value="zh">Chinese</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                  Turns
                </label>
                <input
                  className="h-11 w-full rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 text-sm text-stone-900 outline-none transition-all duration-200 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10 disabled:cursor-not-allowed disabled:opacity-45"
                  type="number"
                  min={1}
                  max={12}
                  value={settings.recentTurns}
                  disabled={settings.contextMode !== "recent_full"}
                  onChange={(event) =>
                    update({
                      recentTurns:
                        Number.parseInt(event.target.value, 10) || 1,
                    })
                  }
                />
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

function ModelField({
  label,
  value,
  models,
  listId,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  models: OpenRouterModel[];
  listId: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </label>
      <input
        className="h-11 w-full rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 text-sm text-stone-900 outline-none transition-all duration-200 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10"
        value={value}
        list={listId}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {formatModelLabel(model)}
          </option>
        ))}
      </datalist>
    </div>
  );
}

function formatModelLabel(model: OpenRouterModel) {
  const context = model.contextLength
    ? `${Math.round(model.contextLength / 1000)}k ctx`
    : "ctx unknown";
  const json = model.supportsJson ? "JSON" : "text";

  return `${model.name} · ${context} · ${json}`;
}
