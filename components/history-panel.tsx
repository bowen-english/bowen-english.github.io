"use client";

import { Check, MessageSquareText, Pencil, Trash2, X } from "lucide-react";
import { FormEvent, memo, useState } from "react";
import type { ConversationSession } from "@/lib/types";

type HistoryPanelProps = {
  sessions: ConversationSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, title: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

export const HistoryPanel = memo(function HistoryPanel({
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
    <aside className="history-panel flex h-full min-h-0 flex-col lg:border-r">
      <div className="panel-header history-header flex items-center gap-2 px-4 py-3.5 backdrop-blur">
        <MessageSquareText className="size-4 text-[#aaa2ff]" aria-hidden="true" />
        <h2 className="panel-title text-sm font-extrabold tracking-[-0.01em]">
          History
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {sessions.length === 0 ? (
          <p className="animate-soft-rise rounded-lg border border-dashed border-stone-900/15 bg-[#fffdf8]/55 px-3 py-4 text-sm leading-6 text-stone-500">
            No saved conversations yet.
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              const isEditing = session.id === editingId;

              return (
                <article
                  key={session.id}
                  className={`history-card smooth-transition ${isActive ? "history-card-active" : ""} group animate-soft-rise relative min-h-[86px] overflow-hidden rounded-2xl border px-4 py-3.5 ${
                    isActive
                      ? "border-[#6558f5]/20 bg-[#f1f8f5] text-[#201d35] shadow-sm shadow-stone-900/[0.04] before:absolute before:inset-y-4 before:left-0 before:w-0.5 before:rounded-r-full before:bg-[#6558f5]"
                      : "border-stone-900/10 bg-[#fffdf8]/80 text-stone-800 shadow-sm shadow-stone-900/[0.04] hover:-translate-y-0.5 hover:border-[#6558f5]/20 hover:bg-[#fffdf8] hover:shadow-md"
                  }`}
                >
                  {isEditing ? (
                    <form
                      className="flex min-h-14 items-center gap-2"
                      onSubmit={(event) => submitRename(event, session)}
                    >
                      <input
                        className="smooth-transition h-9 min-w-0 flex-1 rounded-lg border border-stone-900/10 bg-[#fffdf8] px-2 text-sm font-semibold text-[#201d35] outline-none focus:border-[#6558f5]/45 focus:ring-4 focus:ring-[#6558f5]/10"
                        value={draftTitle}
                        autoFocus
                        onChange={(event) => setDraftTitle(event.target.value)}
                      />
                      <button
                        className="smooth-transition flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#6558f5] text-white shadow-sm shadow-[#6558f5]/15 hover:-translate-y-0.5 hover:bg-[#5145d9]"
                        type="submit"
                        title="Save name"
                      >
                        <Check className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        className="smooth-transition flex size-9 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:-translate-y-0.5 hover:bg-stone-100 hover:text-stone-950"
                        type="button"
                        onClick={cancelEditing}
                        title="Cancel rename"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </form>
                  ) : (
                    <div className="relative">
                      <button
                        className="block w-full min-w-0 pr-16 text-left"
                        type="button"
                        onClick={() => onSelectSession(session.id)}
                        title={session.title}
                      >
                        <span className="block truncate text-[15px] font-semibold leading-5">
                          {session.title}
                        </span>
                        <span
                          className={`mt-2 block text-[13px] leading-5 ${
                            isActive ? "text-stone-500" : "text-stone-400"
                          }`}
                        >
                          {session.messages.length} messages ·{" "}
                          {session.feedback.length} notes
                        </span>
                      </button>
                      <div className="smooth-transition absolute right-0 top-0 flex translate-y-0 gap-1 opacity-100 lg:translate-y-0.5 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
                        <button
                          className={`smooth-transition flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            isActive
                              ? "text-stone-500 hover:bg-white/65 hover:text-[#201d35]"
                              : "text-stone-400 hover:bg-stone-100 hover:text-stone-900"
                          }`}
                          type="button"
                          onClick={() => startEditing(session)}
                          title="Rename conversation"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          className={`smooth-transition flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            isActive
                              ? "text-stone-500 hover:bg-white/65 hover:text-[#201d35]"
                              : "text-stone-400 hover:bg-rose-50 hover:text-rose-700"
                          }`}
                          type="button"
                          onClick={() => onDeleteSession(session.id)}
                          title="Delete conversation"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
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
});
