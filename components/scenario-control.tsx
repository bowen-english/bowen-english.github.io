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
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverId = useId();
  const hasScenario = Boolean(scenario.trim());
  const selectedPresetId = useMemo(() => {
    const normalizedDraft = draft.trim();

    return (
      presets.find((preset) => preset.value.trim() === normalizedDraft)?.id ??
      null
    );
  }, [draft, presets]);

  const resetPopover = useCallback(() => {
    setOpen(false);
    setManagerOpen(false);
    setEditingPreset(null);
    setPresetError(null);
  }, []);

  const close = useCallback(() => {
    resetPopover();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [resetPopover]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        resetPopover();
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, open, resetPopover]);

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
    <div ref={rootRef} className="relative z-50">
      <button
        ref={triggerRef}
        className={`smooth-transition inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold shadow-sm hover:-translate-y-0.5 sm:h-8 ${
          hasScenario
            ? "border-[#6558f5]/25 bg-[#eeecff] text-[#6558f5] shadow-stone-900/[0.03]"
            : "border-stone-900/10 bg-[#fffdf8]/70 text-stone-600 hover:bg-[#fffdf8]"
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
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
      >
        <Drama className="size-3.5" aria-hidden="true" />
        Scenario
      </button>

      {open ? (
        <div
          id={popoverId}
          className="scenario-popover animate-soft-rise absolute right-0 top-11 z-50 max-h-[min(70dvh,560px)] w-[min(500px,calc(100vw-1.25rem))] overflow-y-auto p-4 backdrop-blur sm:top-10 sm:w-[min(500px,calc(100vw-2rem))]"
          role="dialog"
          aria-label="Conversation scenario"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#201d35]">
                Conversation Scenario
              </h3>
              <p className="mt-1 text-sm leading-5 text-stone-500">
                Optional. Use Chinese or English; it applies to this conversation.
              </p>
            </div>
            <button
              className="smooth-transition flex size-8 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:-translate-y-0.5 hover:bg-stone-100 hover:text-stone-950"
              type="button"
              onClick={() => close()}
              title="Close scenario"
              aria-label="Close scenario"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {presets.length > 0 ? (
              presets.map((preset) => (
                <button
                  key={preset.id}
                  className={`smooth-transition rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    selectedPresetId === preset.id
                      ? "border-[#6558f5]/35 bg-[#eeecff] text-[#6558f5]"
                      : "border-stone-900/10 bg-stone-50 text-stone-700 hover:-translate-y-0.5 hover:border-[#6558f5]/25 hover:bg-[#eeecff] hover:text-[#6558f5]"
                  }`}
                  type="button"
                  onClick={() => setDraft(preset.value)}
                  aria-pressed={selectedPresetId === preset.id}
                >
                  {preset.label}
                </button>
              ))
            ) : (
              <p className="text-sm text-stone-500">
                No presets yet. Add one from the preset library.
              </p>
            )}
          </div>

          <textarea
            className="smooth-transition min-h-28 w-full resize-none rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 py-2 text-sm leading-6 text-[#201d35] outline-none placeholder:text-stone-400 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Conversation scenario"
            placeholder="Example: Practice rebooking a flight at the airport. Chat Partner plays the airline agent."
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                className="smooth-transition text-sm font-semibold text-stone-500 hover:text-stone-950"
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
                className="smooth-transition inline-flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-stone-950"
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
              className="shine-sweep smooth-transition inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#201d35] px-4 text-sm font-semibold text-white shadow-sm shadow-stone-900/10 hover:-translate-y-0.5 hover:bg-[#171529] focus:outline-none focus:ring-4 focus:ring-[#6558f5]/15"
              type="button"
              onClick={saveScenario}
            >
              <Check className="size-4" aria-hidden="true" />
              Save
            </button>
          </div>

          {managerOpen ? (
            <div className="mt-4 border-t border-stone-900/10 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-[#201d35]">
                    Preset Library
                  </h4>
                  <p className="mt-1 text-sm leading-5 text-stone-500">
                    Saved locally and available for future conversations.
                  </p>
                </div>
                <button
                  className="smooth-transition inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-stone-900/10 bg-white px-2.5 text-xs font-bold text-stone-700 shadow-sm hover:-translate-y-0.5 hover:bg-stone-50"
                  type="button"
                  onClick={startNewPreset}
                  aria-label="Create a scenario preset"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  New
                </button>
              </div>

              {editingPreset ? (
                <div className="mt-3 rounded-lg border border-[#6558f5]/15 bg-[#eeecff]/65 p-3">
                  <label
                    className="block text-xs font-bold uppercase tracking-[0.16em] text-stone-500"
                    htmlFor={`${popoverId}-preset-name`}
                  >
                    Preset name
                  </label>
                  <input
                    id={`${popoverId}-preset-name`}
                    className="smooth-transition mt-1 h-9 w-full rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 text-sm text-[#201d35] outline-none placeholder:text-stone-400 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10"
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
                  <label
                    className="mt-3 block text-xs font-bold uppercase tracking-[0.16em] text-stone-500"
                    htmlFor={`${popoverId}-preset-scenario`}
                  >
                    Scenario
                  </label>
                  <textarea
                    id={`${popoverId}-preset-scenario`}
                    className="smooth-transition mt-1 min-h-24 w-full resize-none rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 py-2 text-sm leading-6 text-[#201d35] outline-none placeholder:text-stone-400 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10"
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
                      className="smooth-transition h-9 rounded-lg px-3 text-sm font-semibold text-stone-500 hover:bg-white hover:text-stone-950"
                      type="button"
                      onClick={() => {
                        setEditingPreset(null);
                        setPresetError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="smooth-transition inline-flex h-9 items-center gap-2 rounded-lg bg-[#6558f5] px-3 text-sm font-semibold text-white shadow-sm shadow-[#6558f5]/15 hover:-translate-y-0.5 hover:bg-[#5145d9] focus:outline-none focus:ring-4 focus:ring-[#6558f5]/20"
                      type="button"
                      onClick={savePreset}
                    >
                      <Save className="size-4" aria-hidden="true" />
                      Save preset
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-stone-900/10 bg-white">
                {presets.length > 0 ? (
                  presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="smooth-transition flex items-center gap-3 border-b border-stone-900/5 px-3 py-2 last:border-b-0 hover:bg-stone-50/80"
                    >
                      <button
                        className="min-w-0 flex-1 text-left"
                        type="button"
                        onClick={() => setDraft(preset.value)}
                        title="Use this preset"
                      >
                        <span className="block truncate text-sm font-semibold text-[#201d35]">
                          {preset.label}
                        </span>
                        <span className="mt-0.5 line-clamp-1 block text-xs text-stone-500">
                          {preset.value}
                        </span>
                      </button>
                      <button
                        className="smooth-transition flex size-8 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:-translate-y-0.5 hover:bg-stone-100 hover:text-stone-950"
                        type="button"
                        onClick={() => startEditPreset(preset)}
                        title="Edit preset"
                        aria-label={`Edit ${preset.label}`}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        className="smooth-transition flex size-8 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:-translate-y-0.5 hover:bg-rose-50 hover:text-rose-700"
                        type="button"
                        onClick={() => deletePreset(preset.id)}
                        title="Delete preset"
                        aria-label={`Delete ${preset.label}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-sm text-stone-500">
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
