"use client";

import { MessageSquareText, Trash2 } from "lucide-react";
import type { ConversationSession } from "@/lib/types";

type HistoryPanelProps = {
  sessions: ConversationSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

export function HistoryPanel({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
}: HistoryPanelProps) {
  return (
    <section className="border-b border-black/10 bg-white/35 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-3">
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
          <MessageSquareText className="size-4" aria-hidden="true" />
          History
        </div>

        {sessions.length === 0 ? (
          <p className="shrink-0 text-sm text-zinc-500">
            No saved conversations yet.
          </p>
        ) : (
          <div className="flex min-w-0 gap-2">
            {sessions.map((session) => {
              const isActive = session.id === currentSessionId;

              return (
                <div
                  key={session.id}
                  className={`flex h-10 max-w-[260px] shrink-0 items-center rounded-lg border ${
                    isActive
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-black/10 bg-white/75 text-zinc-800"
                  }`}
                >
                  <button
                    className="min-w-0 flex-1 truncate px-3 text-left text-sm font-semibold"
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    title={session.title}
                  >
                    {session.title}
                  </button>
                  <button
                    className={`flex size-9 shrink-0 items-center justify-center rounded-r-lg transition ${
                      isActive
                        ? "text-white/75 hover:bg-white/10 hover:text-white"
                        : "text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                    }`}
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    title="Delete conversation"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
