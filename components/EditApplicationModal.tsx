"use client";

import { Application } from "@/types";
import { LIMITS, limitText } from "@/lib/validation";
import { useEffect, useState } from "react";

type EditApplicationModalProps = {
  application: Application;
  onCancel: () => void;
  onSave: (fields: {
    role: string;
    company: string;
    location?: string;
  }) => void | Promise<void>;
  onDelete: () => void;
};

export default function EditApplicationModal({
  application,
  onCancel,
  onSave,
  onDelete,
}: EditApplicationModalProps) {
  const [role, setRole] = useState(application.role);
  const [company, setCompany] = useState(application.company);
  const [location, setLocation] = useState(application.location ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Close on 'Esc'
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  async function handleSave() {
    const trimmedRole = role.trim();
    const trimmedCompany = company.trim();
    if (!trimmedRole || !trimmedCompany || saving) return;
    setSaving(true);
    try {
      await onSave({
        role: trimmedRole,
        company: trimmedCompany,
        location: location.trim() || undefined,
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
        aria-label="Edit application"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[95dvh] w-full max-w-md flex-col rounded-t-lg border border-border bg-panel-raised p-4 shadow-xl sm:max-h-[90vh] sm:rounded-lg sm:p-6"
      >
        <h2 className="text-base font-semibold tracking-tight">
          Edit application
        </h2>

        <div className="mt-5 flex-1 space-y-4 overflow-y-auto pr-1">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-strong">
              Role <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={role}
              maxLength={LIMITS.role}
              onChange={(e) => setRole(limitText(e.target.value, LIMITS.role))}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g. Frontend Engineer"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-strong">
              Company <span className="text-red-400">*</span>
            </label>
            <input
              value={company}
              maxLength={LIMITS.company}
              onChange={(e) =>
                setCompany(limitText(e.target.value, LIMITS.company))
              }
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g. Acme Inc."
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-strong">
              Location <span className="text-muted">(optional)</span>
            </label>
            <input
              value={location}
              maxLength={LIMITS.location}
              onChange={(e) =>
                setLocation(limitText(e.target.value, LIMITS.location))
              }
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g. Remote"
              className={fieldClass}
            />
          </div>
        </div>

        {confirmingDelete ? (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border-soft pt-4">
            <p className="mr-auto max-w-60 text-sm text-muted">
              Delete this application and all of its timeline events?
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
              Delete application
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => setConfirmingDelete(true)}
              className="mr-auto cursor-pointer rounded-md border border-red-400/20 bg-red-400/10 px-4 py-1.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-400/20 focus:outline-none focus-visible:border-red-400"
            >
              Delete application
            </button>
            <button
              onClick={onCancel}
              className="cursor-pointer rounded-md border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground focus:outline-none focus-visible:border-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !role.trim() || !company.trim()}
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
