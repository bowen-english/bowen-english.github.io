"use client";

import { Check, Drama, X } from "lucide-react";
import { FormEvent, useState } from "react";

const SCENARIO_PRESETS = [
  {
    label: "Coffee chat",
    value:
      "You are chatting casually with a friendly colleague at a coffee shop before work.",
  },
  {
    label: "Job interview",
    value:
      "You are in a job interview. The Chat Partner is the interviewer asking realistic follow-up questions.",
  },
  {
    label: "Travel help",
    value:
      "You are traveling abroad and asking for help with directions, transport, food, or local recommendations.",
  },
  {
    label: "Work update",
    value:
      "You are giving a short work update in a meeting and answering follow-up questions from a teammate.",
  },
  {
    label: "Daily life",
    value:
      "You are talking about ordinary daily life, habits, plans, feelings, and small personal stories.",
  },
];

type ScenarioControlProps = {
  scenario: string;
  onChange: (scenario: string) => void;
};

export function ScenarioControl({ scenario, onChange }: ScenarioControlProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(scenario);
  const hasScenario = Boolean(scenario.trim());

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onChange(draft.trim());
    setOpen(false);
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
          setDraft(scenario);
          setOpen((current) => !current);
        }}
        title="Set conversation scenario"
      >
        <Drama className="size-3.5" aria-hidden="true" />
        Scenario
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-30 w-[min(420px,calc(100vw-2rem))] rounded-lg border border-black/10 bg-white p-4 shadow-2xl shadow-zinc-900/15">
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
              onClick={() => setOpen(false)}
              title="Close scenario"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="rounded-full border border-black/10 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-teal-500/30 hover:bg-teal-50 hover:text-teal-800"
                type="button"
                onClick={() => setDraft(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <textarea
              className="min-h-28 w-full resize-none rounded-lg border border-black/10 bg-white px-3 py-2 text-sm leading-6 text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Example: 我想练习在机场改签航班，Chat Partner 扮演航空公司工作人员。"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-950"
                type="button"
                onClick={() => {
                  setDraft("");
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear scenario
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/15"
                type="submit"
              >
                <Check className="size-4" aria-hidden="true" />
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
