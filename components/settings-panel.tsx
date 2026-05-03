"use client";

import { Eye, EyeOff, Plus, RefreshCw, Settings2 } from "lucide-react";
import { useState } from "react";
import {
  COACH_CONTEXT_OPTIONS,
  type CoachContextMode,
  type CoachExplanationLanguage,
  type CoachSettings,
  type OpenRouterModel,
} from "@/lib/types";

type SettingsPanelProps = {
  settings: CoachSettings;
  models: OpenRouterModel[];
  modelsLoading: boolean;
  modelsError: string | null;
  modelsSource: "user" | "public" | null;
  recordCount: number;
  feedbackCount: number;
  onChange: (settings: CoachSettings) => void;
  onRefreshModels: () => void;
  onNewSession: () => void;
};

export function SettingsPanel({
  settings,
  models,
  modelsLoading,
  modelsError,
  modelsSource,
  recordCount,
  feedbackCount,
  onChange,
  onRefreshModels,
  onNewSession,
}: SettingsPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const update = (patch: Partial<CoachSettings>) => {
    onChange({ ...settings, ...patch });
  };

  return (
    <section className="border-y border-black/10 bg-white/50 backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(260px,0.9fr)_150px_120px_162px] lg:items-end">
        <div className="min-w-0 lg:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            OpenRouter API Key
          </label>
          <div className="flex h-11 rounded-lg border border-black/10 bg-white/75 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">
            <input
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
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
              className="flex size-11 shrink-0 items-center justify-center rounded-r-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
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
        </div>

        <ModelField
          label="Chat Model"
          value={settings.chatModel}
          models={models}
          listId="chat-model-options"
          onChange={(value) => update({ chatModel: value })}
        />

        <ModelField
          label="Coach Model"
          value={settings.coachModel}
          models={models}
          listId="coach-model-options"
          onChange={(value) => update({ coachModel: value })}
        />

        <div className="min-w-0">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Coach Context
          </label>
          <select
            className="h-11 w-full rounded-lg border border-black/10 bg-white/75 px-3 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            value={settings.contextMode}
            onChange={(event) =>
              update({ contextMode: event.target.value as CoachContextMode })
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
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Explanation
          </label>
          <select
            className="h-11 w-full rounded-lg border border-black/10 bg-white/75 px-3 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
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
          <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Turns
          </label>
          <input
            className="h-11 w-full rounded-lg border border-black/10 bg-white/75 px-3 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-45"
            type="number"
            min={1}
            max={12}
            value={settings.recentTurns}
            disabled={settings.contextMode !== "recent_full"}
            onChange={(event) =>
              update({
                recentTurns: Number.parseInt(event.target.value, 10) || 1,
              })
            }
          />
        </div>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-black/10 bg-zinc-950 px-3 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/15"
          type="button"
          onClick={onNewSession}
          title="Start a new conversation"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Chat
        </button>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-2">
          <Settings2 className="size-3.5" aria-hidden="true" />
          {recordCount} messages · {feedbackCount} feedback items
        </span>
        <button
          className="inline-flex items-center gap-1.5 font-semibold text-teal-700 transition hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={onRefreshModels}
          disabled={modelsLoading}
        >
          <RefreshCw
            className={`size-3.5 ${modelsLoading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Refresh models
        </button>
        <span>
          {modelsLoading
            ? "Loading OpenRouter models..."
            : `${models.length} models · ${modelsSource === "user" ? "account list" : "public list"}`}
        </span>
        {modelsError ? (
          <span className="text-rose-700">{modelsError}</span>
        ) : null}
      </div>
    </section>
  );
}

function ModelField({
  label,
  value,
  models,
  listId,
  onChange,
}: {
  label: string;
  value: string;
  models: OpenRouterModel[];
  listId: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </label>
      <input
        className="h-11 w-full rounded-lg border border-black/10 bg-white/75 px-3 text-sm text-zinc-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
        value={value}
        list={listId}
        onChange={(event) => onChange(event.target.value)}
        placeholder="openai/gpt-4.1-mini"
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
