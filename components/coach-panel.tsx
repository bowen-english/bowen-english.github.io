"use client";

import { AlertTriangle, CheckCircle2, Loader2, WandSparkles } from "lucide-react";
import type { CoachFeedback, CoachSeverity } from "@/lib/types";

type CoachPanelProps = {
  feedback: CoachFeedback[];
  error: string | null;
  isPending: boolean;
};

const severityStyles: Record<CoachSeverity, string> = {
  none: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
  minor: "border-amber-500/25 bg-amber-400/15 text-amber-800",
  major: "border-rose-500/25 bg-rose-500/10 text-rose-700",
};

function SeverityIcon({ severity }: { severity: CoachSeverity }) {
  if (severity === "none") {
    return <CheckCircle2 className="size-3.5" aria-hidden="true" />;
  }

  return <AlertTriangle className="size-3.5" aria-hidden="true" />;
}

export function CoachPanel({ feedback, error, isPending }: CoachPanelProps) {
  return (
    <section className="flex min-h-0 flex-col bg-white/25">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-950">
            Silent Coach
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Private language feedback</p>
        </div>
        {isPending ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-800">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            reviewing
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mx-4 mt-4 rounded-lg border border-rose-500/20 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {feedback.length === 0 ? (
          <div className="flex h-full min-h-[280px] items-center justify-center">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg border border-black/10 bg-white/70 text-teal-700 shadow-sm">
                <WandSparkles className="size-5" aria-hidden="true" />
              </div>
              <p className="text-2xl font-semibold tracking-normal text-zinc-950">
                Feedback will appear here.
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                The coach stays quiet in the conversation.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {feedback.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm shadow-zinc-900/5 backdrop-blur"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] ${severityStyles[item.severity]}`}
                  >
                    <SeverityIcon severity={item.severity} />
                    {item.severity}
                  </span>
                  <time className="text-xs text-zinc-400">
                    {new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>

                <FeedbackBlock label="Original" value={item.original} />
                <FeedbackBlock label="Corrected" value={item.corrected} strong />
                <FeedbackBlock label="More Natural" value={item.natural} strong />

                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Main Issues
                  </h3>
                  {item.issues.length > 0 ? (
                    <ul className="mt-2 space-y-1.5 text-sm leading-6 text-zinc-700">
                      {item.issues.map((issue) => (
                        <li key={issue} className="break-words">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-500">No major issues.</p>
                  )}
                </div>

                <FeedbackBlock
                  label="Explanation"
                  value={item.explanation ?? item.explanationZh ?? ""}
                />
                <FeedbackBlock label="Reusable Pattern" value={item.pattern} strong />
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

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
      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </h3>
      <p
        className={`mt-1 whitespace-pre-wrap break-words text-sm leading-6 ${
          strong ? "font-semibold text-zinc-950" : "text-zinc-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
