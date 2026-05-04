"use client";

import {
  Check,
  Drama,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ScenarioPreset } from "@/lib/types";

type ScenarioControlProps = {
  scenario: string;
  presets: ScenarioPreset[];
  onChange: (scenario: string) => void;
  onPresetsChange: (presets: ScenarioPreset[]) => void;
};

type EditingPreset = {
  id: string | null;
  label: string;
  value: string;
};

function makePresetId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function ScenarioControl({
  scenario,
  presets,
  onChange,
  onPresetsChange,
}: ScenarioControlProps) {
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [draft, setDraft] = useState(scenario);
  const [editingPreset, setEditingPreset] = useState<EditingPreset | null>(null);
  const [presetError, setPresetError] = useState<string | null>(null);
  const hasScenario = Boolean(scenario.trim());
  const selectedPresetId = useMemo(() => {
    const normalizedDraft = draft.trim();

    return (
      presets.find((preset) => preset.value.trim() === normalizedDraft)?.id ??
      null
    );
  }, [draft, presets]);

  const close = () => {
    setOpen(false);
    setManagerOpen(false);
    setEditingPreset(null);
    setPresetError(null);
  };

  const saveScenario = () => {
    onChange(draft.trim());
    close();
  };

  const startNewPreset = () => {
    setManagerOpen(true);
    setPresetError(null);
    setEditingPreset({
      id: null,
      label: "",
      value: draft.trim() || scenario.trim(),
    });
  };

  const startEditPreset = (preset: ScenarioPreset) => {
    setManagerOpen(true);
    setPresetError(null);
    setEditingPreset({
      id: preset.id,
      label: preset.label,
      value: preset.value,
    });
  };

  const savePreset = () => {
    if (!editingPreset) {
      return;
    }

    const label = editingPreset.label.trim();
    const value = editingPreset.value.trim();

    if (!label || !value) {
      setPresetError("Add both a preset name and a scenario.");
      return;
    }

    if (editingPreset.id) {
      const previousPreset = presets.find(
        (preset) => preset.id === editingPreset.id,
      );
      const nextPresets = presets.map((preset) =>
        preset.id === editingPreset.id ? { ...preset, label, value } : preset,
      );

      onPresetsChange(nextPresets);

      if (previousPreset && draft.trim() === previousPreset.value.trim()) {
        setDraft(value);
      }

      if (previousPreset && scenario.trim() === previousPreset.value.trim()) {
        onChange(value);
      }
    } else {
      onPresetsChange([
        ...presets,
        {
          id: makePresetId(),
          label,
          value,
        },
      ]);
      setDraft(value);
    }

    setEditingPreset(null);
    setPresetError(null);
  };

  const deletePreset = (presetId: string) => {
    onPresetsChange(presets.filter((preset) => preset.id !== presetId));

    if (editingPreset?.id === presetId) {
      setEditingPreset(null);
      setPresetError(null);
    }
  };

  return (
    <div className="relative">
      <button
        className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition ${
          hasScenario
            ? "border-teal-500/30 bg-teal-500/10 text-teal-700"
            : "border-black/10 bg-white/70 text-zinc-600 hover:bg-white"
        }`}
        type="button"
        onClick={() => {
          if (open) {
            close();
            return;
          }

          setDraft(scenario);
          setOpen(true);
        }}
        title="Set conversation scenario"
      >
        <Drama className="size-3.5" aria-hidden="true" />
        Scenario
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-30 w-[min(500px,calc(100vw-2rem))] rounded-lg border border-black/10 bg-white p-4 shadow-2xl shadow-zinc-900/15">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-950">
                Conversation Scenario
              </h3>
              <p className="mt-1 text-sm leading-5 text-zinc-500">
                Optional. Use Chinese or English; it applies to this conversation.
              </p>
            </div>
            <button
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
              type="button"
              onClick={close}
              title="Close scenario"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {presets.length > 0 ? (
              presets.map((preset) => (
                <button
                  key={preset.id}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedPresetId === preset.id
                      ? "border-teal-500/40 bg-teal-50 text-teal-800"
                      : "border-black/10 bg-zinc-50 text-zinc-700 hover:border-teal-500/30 hover:bg-teal-50 hover:text-teal-800"
                  }`}
                  type="button"
                  onClick={() => setDraft(preset.value)}
                >
                  {preset.label}
                </button>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                No presets yet. Add one from the preset library.
              </p>
            )}
          </div>

          <textarea
            className="min-h-28 w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Example: Practice rebooking a flight at the airport. Chat Partner plays the airline agent."
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
                type="button"
                onClick={() => {
                  setDraft("");
                  onChange("");
                  close();
                }}
              >
                Clear scenario
              </button>
              <button
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
                type="button"
                onClick={() => {
                  setManagerOpen((current) => !current);
                  setEditingPreset(null);
                  setPresetError(null);
                }}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                Manage presets
              </button>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/15"
              type="button"
              onClick={saveScenario}
            >
              <Check className="size-4" aria-hidden="true" />
              Save
            </button>
          </div>

          {managerOpen ? (
            <div className="mt-4 border-t border-black/10 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-950">
                    Preset Library
                  </h4>
                  <p className="mt-1 text-sm leading-5 text-zinc-500">
                    Saved locally and available for future conversations.
                  </p>
                </div>
                <button
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-black/10 bg-white px-2.5 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
                  type="button"
                  onClick={startNewPreset}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  New
                </button>
              </div>

              {editingPreset ? (
                <div className="mt-3 rounded-lg border border-teal-500/20 bg-teal-50/50 p-3">
                  <label className="block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Preset name
                  </label>
                  <input
                    className="mt-1 h-9 w-full rounded-lg border border-black/10 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    value={editingPreset.label}
                    onChange={(event) =>
                      setEditingPreset((current) =>
                        current
                          ? { ...current, label: event.target.value }
                          : current,
                      )
                    }
                    placeholder="Airport rebooking"
                  />
                  <label className="mt-3 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                    Scenario
                  </label>
                  <textarea
                    className="mt-1 min-h-24 w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                    value={editingPreset.value}
                    onChange={(event) =>
                      setEditingPreset((current) =>
                        current
                          ? { ...current, value: event.target.value }
                          : current,
                      )
                    }
                    placeholder="Describe the role-play situation..."
                  />
                  {presetError ? (
                    <p className="mt-2 text-sm font-semibold text-rose-700">
                      {presetError}
                    </p>
                  ) : null}
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      className="h-9 rounded-lg px-3 text-sm font-semibold text-zinc-500 transition hover:bg-white hover:text-zinc-950"
                      type="button"
                      onClick={() => {
                        setEditingPreset(null);
                        setPresetError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-500/20"
                      type="button"
                      onClick={savePreset}
                    >
                      <Save className="size-4" aria-hidden="true" />
                      Save preset
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-black/10 bg-white">
                {presets.length > 0 ? (
                  presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex items-center gap-3 border-b border-black/5 px-3 py-2 last:border-b-0"
                    >
                      <button
                        className="min-w-0 flex-1 text-left"
                        type="button"
                        onClick={() => setDraft(preset.value)}
                        title="Use this preset"
                      >
                        <span className="block truncate text-sm font-semibold text-zinc-950">
                          {preset.label}
                        </span>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-zinc-500">
                          {preset.value}
                        </span>
                      </button>
                      <button
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                        type="button"
                        onClick={() => startEditPreset(preset)}
                        title="Edit preset"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-rose-50 hover:text-rose-700"
                        type="button"
                        onClick={() => deletePreset(preset.id)}
                        title="Delete preset"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-zinc-500">
                    Your custom presets will appear here.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
