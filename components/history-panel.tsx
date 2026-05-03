"use client";

import { Check, MessageSquareText, Pencil, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { ConversationSession } from "@/lib/types";

type HistoryPanelProps = {
  sessions: ConversationSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

export function HistoryPanel({
  sessions,
  currentSessionId,
  onSelectSession,
  onRenameSession,
  onDeleteSession,
}: HistoryPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const startEditing = (session: ConversationSession) => {
    setEditingId(session.id);
    setDraftTitle(session.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftTitle("");
  };

  const submitRename = (
    event: FormEvent<HTMLFormElement>,
    session: ConversationSession,
  ) => {
    event.preventDefault();
    const title = draftTitle.trim();

    if (title) {
      onRenameSession(session.id, title);
    }

    cancelEditing();
  };

  return (
    <aside className="flex min-h-0 flex-col border-black/10 bg-white/45 lg:border-r">
      <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
        <MessageSquareText className="size-4 text-teal-700" aria-hidden="true" />
        <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-zinc-950">
          History
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {sessions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 px-3 py-4 text-sm leading-6 text-zinc-500">
            No saved conversations yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const isEditing = session.id === editingId;

              return (
                <article
                  key={session.id}
                  className={`rounded-lg border p-2 transition ${
                    isActive
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-sm shadow-zinc-900/10"
                      : "border-black/10 bg-white/75 text-zinc-800 hover:border-teal-500/30"
                  }`}
                >
                  {isEditing ? (
                    <form
                      className="flex items-center gap-1"
                      onSubmit={(event) => submitRename(event, session)}
                    >
                      <input
                        className="h-9 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2 text-sm font-semibold text-zinc-950 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
                        value={draftTitle}
                        autoFocus
                        onChange={(event) => setDraftTitle(event.target.value)}
                      />
                      <button
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white transition hover:bg-teal-700"
                        type="submit"
                        title="Save name"
                      >
                        <Check className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
                        type="button"
                        onClick={cancelEditing}
                        title="Cancel rename"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-start gap-2">
                      <button
                        className="min-w-0 flex-1 text-left"
                        type="button"
                        onClick={() => onSelectSession(session.id)}
                        title={session.title}
                      >
                        <span className="block truncate text-sm font-semibold">
                          {session.title}
                        </span>
                        <span
                          className={`mt-1 block text-xs ${
                            isActive ? "text-white/55" : "text-zinc-400"
                          }`}
                        >
                          {session.messages.length} messages ·{" "}
                          {session.feedback.length} notes
                        </span>
                      </button>
                      <button
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition ${
                          isActive
                            ? "text-white/65 hover:bg-white/10 hover:text-white"
                            : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                        type="button"
                        onClick={() => startEditing(session)}
                        title="Rename conversation"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition ${
                          isActive
                            ? "text-white/65 hover:bg-white/10 hover:text-white"
                            : "text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                        }`}
                        type="button"
                        onClick={() => onDeleteSession(session.id)}
                        title="Delete conversation"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
