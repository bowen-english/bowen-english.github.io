"use client";

import { FormEvent, memo, useState } from "react";
import {
  Loader2,
  WandSparkles,
  X,
} from "lucide-react";
import type { CoachFeedback, CoachSeverity } from "@/lib/types";

type CoachPanelProps = {
  feedback: CoachFeedback[];
  error: string | null;
  isPending: boolean;
  practiceFeedbackId: string | null;
  rebuttingFeedbackId: string | null;
  canPractice: boolean;
  onPracticeFeedback: (feedbackId: string) => void;
  onRebutFeedback: (
    feedbackId: string,
    rebuttal: string,
  ) => boolean | Promise<boolean>;
};

const severityStyles: Record<CoachSeverity, string> = {
  none: "border-[#6558f5]/15 bg-[#eeecff] text-[#6558f5]",
  minor: "border-stone-900/10 bg-stone-50 text-stone-700",
  major: "border-rose-900/10 bg-rose-50 text-rose-800",
};

export const CoachPanel = memo(function CoachPanel({
  feedback,
  error,
  isPending,
  practiceFeedbackId,
  rebuttingFeedbackId,
  canPractice,
  onPracticeFeedback,
  onRebutFeedback,
}: CoachPanelProps) {
  const [rebuttalId, setRebuttalId] = useState<string | null>(null);
  const [rebuttalDraft, setRebuttalDraft] = useState("");

  const closeRebuttal = () => {
    setRebuttalId(null);
    setRebuttalDraft("");
  };

  const startPractice = (item: CoachFeedback) => {
    setRebuttalId(null);
    setRebuttalDraft("");
    onPracticeFeedback(item.id);
  };

  const startRebuttal = (item: CoachFeedback) => {
    setRebuttalId(item.id);
    setRebuttalDraft(item.rebuttal ?? "");
  };

  const submitRebuttal = async (
    event: FormEvent<HTMLFormElement>,
    feedbackId: string,
  ) => {
    event.preventDefault();

    const content = rebuttalDraft.trim();

    if (!content || isPending) {
      return;
    }

    if (await onRebutFeedback(feedbackId, content)) {
      closeRebuttal();
    }
  };

  return (
    <section className="coach-panel flex h-full min-h-0 flex-col">
      <div className="panel-header coach-header flex items-center justify-between gap-3 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3.5">
        <div className="min-w-0">
          <h2 className="panel-title text-sm font-extrabold tracking-[-0.01em] text-[#201d35]">
            Silent Coach
          </h2>
          <p className="mt-1 truncate text-sm text-stone-500">
            Private language feedback
          </p>
        </div>
        {isPending ? (
          <div className="animate-gentle-pop inline-flex items-center gap-2 rounded-full border border-[#6558f5]/15 bg-[#eeecff] px-3 py-1 text-xs font-semibold text-[#6558f5] shadow-sm shadow-stone-900/[0.03]">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            <span className="hidden sm:inline">reviewing</span>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="animate-gentle-pop mx-4 mt-4 rounded-lg border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm text-rose-700 shadow-sm shadow-rose-900/5">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
        {feedback.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <div className="animate-soft-rise max-w-sm text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg border border-stone-900/10 bg-[#fffdf8]/75 text-[#6558f5] shadow-sm shadow-stone-900/[0.04]">
                <WandSparkles className="size-5" aria-hidden="true" />
              </div>
              <p className="text-xl font-semibold tracking-normal text-[#201d35] sm:text-2xl">
                Feedback will appear here.
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-500">
                The coach stays quiet in the conversation.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {feedback.map((item) => {
              const isPracticing = practiceFeedbackId === item.id;
              const isRebuttalOpen = rebuttalId === item.id;
              const isRebutting = rebuttingFeedbackId === item.id;

              return (
                <article
                  key={item.id}
                  className="feedback-card animate-soft-rise smooth-transition rounded-2xl p-3.5 hover:-translate-y-0.5 sm:p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] ${severityStyles[item.severity]}`}
                    >
                      <span className="size-1.5 rounded-full bg-current" />
                      {item.severity}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.revisedAt ? (
                        <span className="rounded-full border border-[#6558f5]/15 bg-[#eeecff] px-2 py-0.5 text-xs font-semibold text-[#6558f5]">
                          revised
                        </span>
                      ) : null}
                      <time className="text-xs text-stone-400">
                        {new Date(
                          item.revisedAt ?? item.createdAt,
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </div>

                  <FeedbackBlock label="Original" value={item.original} />
                  {isPracticing ? (
                    <div className="mt-4 rounded-lg border border-[#6558f5]/15 bg-[#eeecff] px-3 py-2 text-sm font-semibold text-[#26443f] shadow-sm shadow-stone-900/[0.03]">
                      Editing the highlighted chat message. Save there to rerun
                      Chat + Coach.
                    </div>
                  ) : null}

                  <div
                    className={`smooth-transition ${
                      isPracticing
                        ? "pointer-events-none select-none opacity-30 blur-sm"
                        : ""
                    }`}
                  >
                    <FeedbackBlock
                      label="Corrected"
                      value={item.corrected}
                      strong
                    />
                    <FeedbackBlock
                      label="More Natural"
                      value={item.natural}
                      strong
                    />

                    <div className="mt-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
                        Main Issues
                      </h3>
                      {item.issues.length > 0 ? (
                        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-stone-700">
                          {item.issues.map((issue) => (
                            <li key={issue} className="break-words">
                              {issue}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-stone-500">
                          No major issues.
                        </p>
                      )}
                    </div>

                    <FeedbackBlock
                      label="Explanation"
                      value={item.explanation ?? item.explanationZh ?? ""}
                    />
                    <FeedbackBlock
                      label="Reusable Pattern"
                      value={item.pattern}
                      strong
                    />
                    <FeedbackBlock label="Your Note" value={item.rebuttal ?? ""} />
                  </div>

                  {!isPracticing && !isRebuttalOpen ? (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-900/10 pt-3">
                      <button
                        className="smooth-transition h-10 flex-1 rounded-lg bg-[#201d35] px-3 text-sm font-semibold text-white shadow-sm shadow-stone-900/10 hover:-translate-y-0.5 hover:bg-[#171529] disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:flex-none"
                        type="button"
                        onClick={() => startPractice(item)}
                        disabled={!canPractice}
                      >
                        Try again
                      </button>
                      <button
                        className="smooth-transition h-10 flex-1 rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 text-sm font-semibold text-stone-700 shadow-sm hover:-translate-y-0.5 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:flex-none"
                        type="button"
                        onClick={() => startRebuttal(item)}
                        disabled={isPending}
                      >
                        Explain my meaning
                      </button>
                    </div>
                  ) : null}

                  {isRebuttalOpen ? (
                    <form
                      className="mt-4 rounded-lg border border-[#6558f5]/20 bg-[#eeecff]/70 p-3"
                      onSubmit={(event) => submitRebuttal(event, item.id)}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#201d35]">
                            跟 Coach 解释你的真实意思
                          </p>
                          <p className="mt-1 text-sm leading-5 text-stone-600">
                            用中文说清楚你原本想表达什么，Coach 会重新给建议。
                          </p>
                        </div>
                        <button
                          className="smooth-transition flex size-7 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-white hover:text-stone-950"
                          type="button"
                          onClick={closeRebuttal}
                          title="Cancel"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                      <textarea
                        className="smooth-transition min-h-24 w-full resize-none rounded-lg border border-stone-900/10 bg-[#fffdf8] px-3 py-2 text-sm leading-6 text-[#201d35] outline-none placeholder:text-stone-400 focus:border-[#6558f5]/45 focus:shadow-md focus:shadow-[#6558f5]/10 focus:ring-4 focus:ring-[#6558f5]/10"
                        value={rebuttalDraft}
                        autoFocus
                        onChange={(event) => setRebuttalDraft(event.target.value)}
                        placeholder="例如：我其实想表达的是临时改计划，不是取消约会。请按这个意思重新建议。"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          className="smooth-transition inline-flex h-9 items-center gap-2 rounded-lg bg-[#6558f5] px-3 text-sm font-semibold text-white shadow-sm shadow-[#6558f5]/15 hover:-translate-y-0.5 hover:bg-[#5145d9] focus:outline-none focus:ring-4 focus:ring-[#6558f5]/20 disabled:cursor-not-allowed disabled:opacity-45"
                          type="submit"
                          disabled={!rebuttalDraft.trim() || isPending}
                        >
                          {isRebutting ? (
                            <Loader2
                              className="size-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : null}
                          Update advice
                        </button>
                      </div>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
});

function FeedbackBlock({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="mt-4 first:mt-0">
      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">
        {label}
      </h3>
      <p
        className={`mt-1 whitespace-pre-wrap break-words text-sm leading-6 ${
          strong ? "font-semibold text-[#201d35]" : "text-stone-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
