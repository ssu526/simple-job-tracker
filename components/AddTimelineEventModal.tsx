"use client";

import { TimelineEvent } from "@/types";
import { LIMITS, limitText } from "@/lib/validation";
import { useEffect, useState } from "react";
import { CalendarIcon } from "./icons";

// converts a date string into the format required by <input type="date" />
// that required format is YYYY-MM-DD
function toInputDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type AddTimelineEventModalProps = {
  title: string;
  initialEvent?: TimelineEvent;
  loadingNote?: boolean;
  onCancel: () => void;
  onSave: (event: Omit<TimelineEvent, "id">) => void | Promise<void>;
  onDelete?: () => void;
};

export default function AddTimelineEventModal({
  title,
  initialEvent,
  loadingNote = false,
  onCancel,
  onSave,
  onDelete,
}: AddTimelineEventModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const isEditing = Boolean(initialEvent);
  const [event, setEvent] = useState(initialEvent?.event ?? "");
  const [date, setDate] = useState(
    initialEvent ? toInputDate(initialEvent.date) : today,
  );
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const note = noteDraft ?? initialEvent?.note ?? "";

  // Close on 'Esc'
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  async function handleSave() {
    const trimmedEvent = event.trim();
    if (!trimmedEvent || !date || saving || loadingNote) return;
    setSaving(true);
    try {
      await onSave({
        event: trimmedEvent,
        date,
        note: note.trim() || undefined,
      });
      onCancel();
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full rounded-md border border-border bg-panel px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-muted focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:px-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit timeline event" : "Add timeline event"}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[95dvh] w-full max-w-2xl flex-col rounded-t-lg border border-border bg-panel-raised p-4 shadow-xl sm:max-h-[90vh] sm:rounded-lg sm:p-6"
      >
        <h2 className="text-base font-semibold tracking-tight">
          {isEditing ? "Edit timeline event" : "Add timeline event"}
        </h2>
        <p className="mt-1 truncate text-sm text-muted">{title}</p>
        <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-strong">
              Event <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={event}
              maxLength={LIMITS.event}
              onChange={(e) =>
                setEvent(limitText(e.target.value, LIMITS.event))
              }
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g. Phone screen"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-strong">
              Date <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`${fieldClass} cursor-pointer pr-11`}
              />
              <CalendarIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-strong">
              Note
              <span className="text-muted">
                &nbsp; (optional, max {LIMITS.note} characters)
              </span>
            </label>
            {loadingNote ? (
              <div
                role="status"
                aria-label="Loading note"
                className={`${fieldClass} flex min-h-40 items-center justify-center sm:min-h-64`}
              >
                <span
                  aria-hidden="true"
                  className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-accent"
                />
                <span className="sr-only">Loading note…</span>
              </div>
            ) : (
              <textarea
                value={note}
                maxLength={LIMITS.note}
                onChange={(e) =>
                  setNoteDraft(limitText(e.target.value, LIMITS.note))
                }
                rows={10}
                className={`${fieldClass} min-h-40 resize-y sm:min-h-64`}
              />
            )}
          </div>
        </div>

        {confirmingDelete ? (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border-soft pt-4">
            <p className="mr-auto max-w-60 text-sm text-muted">
              Delete this timeline event?
            </p>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="cursor-pointer rounded-md border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground focus:outline-none focus-visible:border-muted"
            >
              Keep it
            </button>
            <button
              onClick={onDelete}
              className="cursor-pointer rounded-md border border-red-400/30 bg-red-400/15 px-4 py-1.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-400/25 focus:outline-none focus-visible:border-red-400"
            >
              Delete event
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            {isEditing && onDelete && (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={loadingNote}
                className="mr-auto cursor-pointer rounded-md border border-red-400/20 bg-red-400/10 px-4 py-1.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-400/20 focus:outline-none focus-visible:border-red-400"
              >
                Delete event
              </button>
            )}
            <button
              onClick={onCancel}
              className="cursor-pointer rounded-md border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground focus:outline-none focus-visible:border-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loadingNote || !event.trim() || !date}
              className="cursor-pointer rounded-md border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:border-muted"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
