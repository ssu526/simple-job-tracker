import {
  Application,
  ApplicationStatus,
  TimelineEvent,
  statusColors,
} from "@/types";
import { BriefcaseIcon, MapPinIcon, PlusIcon, StarIcon } from "./icons";
import AddTimelineEventModal from "./AddTimelineEventModal";
import EditApplicationModal from "./EditApplicationModal";
import { useRef, useState } from "react";
import { formatDateOnly } from "@/lib/date";

type ApplicationProps = {
  application: Application;
  onUpdateStatus: (applicationId: number, status: ApplicationStatus) => void;
  onUpdateFollowUp: (applicationId: number, followUp: boolean) => void;
  onUpdateApplication: (
    applicationId: number,
    fields: { role: string; company: string; location?: string },
  ) => void | Promise<void>;
  onAddTimelineEvent: (
    applicationId: number,
    event: Omit<TimelineEvent, "id">,
  ) => void | Promise<void>;
  onLoadTimelineEvent: (
    applicationId: number,
    eventId: number,
    silent?: boolean,
  ) => Promise<TimelineEvent>;
  onUpdateTimelineEvent: (
    applicationId: number,
    event: TimelineEvent,
  ) => void | Promise<void>;
  onDeleteTimelineEvent: (applicationId: number, eventId: number) => void;
  onDelete: (applicationId: number) => void;
};

export default function ApplicationCard({
  application,
  onUpdateStatus,
  onUpdateFollowUp,
  onUpdateApplication,
  onAddTimelineEvent,
  onLoadTimelineEvent,
  onUpdateTimelineEvent,
  onDeleteTimelineEvent,
  onDelete,
}: ApplicationProps) {
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [loadingEventId, setLoadingEventId] = useState<number | null>(null);
  const [isEditingApplication, setIsEditingApplication] = useState(false);
  const editingEventId = useRef<number | null>(null);

  function prefetchEvent(event: TimelineEvent) {
    if (event.noteLoaded) return;
    void onLoadTimelineEvent(application.id, event.id, true).catch(() => {
      // Hover -> start background request
      // Don't show an error if this background fetch fails.
    });
  }

  async function handleEditEvent(event: TimelineEvent) {
    editingEventId.current = event.id;
    setEditingEvent(event);
    if (event.noteLoaded) return;

    setLoadingEventId(event.id);
    try {
      const loadedEvent = await onLoadTimelineEvent(application.id, event.id);
      if (editingEventId.current === event.id) {
        setEditingEvent(loadedEvent);
      }
    } catch {
      if (editingEventId.current === event.id) {
        editingEventId.current = null;
        setEditingEvent(null);
      }
    } finally {
      setLoadingEventId(null);
    }
  }

  return (
    <div className="group grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-4 px-4 py-4 transition-colors hover:bg-white/[0.02] md:grid-cols-[110px_260px_minmax(0,1fr)] md:gap-4 md:px-5">
      {/* Status */}
      <div>
        <select
          value={application.status}
          onChange={(e) =>
            onUpdateStatus(application.id, e.target.value as ApplicationStatus)
          }
          aria-label="Application status"
          className={`cursor-pointer appearance-none rounded-md px-2 py-1 text-xs font-medium focus:outline-none ${
            statusColors[application.status]
          }`}
        >
          {Object.values(ApplicationStatus).map((status) => (
            <option
              key={status}
              value={status}
              className="bg-panel text-foreground"
            >
              {status}
            </option>
          ))}
        </select>
      </div>

      {/* Company / Position */}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            onClick={() => setIsEditingApplication(true)}
            aria-label={`Edit ${application.role} application`}
            className="min-w-0 cursor-pointer truncate text-left text-sm font-medium text-foreground transition-colors hover:text-accent focus:outline-none focus-visible:text-accent"
          >
            {application.role}
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateFollowUp(application.id, !application.followUp)
            }
            aria-label={
              application.followUp
                ? `Remove follow-up from ${application.role}`
                : `Mark ${application.role} for follow-up`
            }
            aria-pressed={application.followUp}
            title={
              application.followUp ? "Remove follow-up" : "Mark for follow-up"
            }
            className={`shrink-0 cursor-pointer p-0.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-400 ${
              application.followUp
                ? "text-amber-400"
                : "text-muted hover:text-muted-strong"
            }`}
          >
            <StarIcon
              className={`h-4 w-4 ${application.followUp ? "fill-current" : ""}`}
            />
          </button>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1">
            <BriefcaseIcon className="h-3 w-3" />
            {application.company}
          </span>

          {application.location && (
            <span className="flex items-center gap-1">
              <MapPinIcon className="h-3 w-3" />
              {application.location}
            </span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="scrollbar-thin col-span-2 min-w-0 overflow-x-auto pb-2 md:col-span-1">
        <div className="flex min-w-max items-center">
          {application.timeline.map((e, index) => (
            <div key={e.id} className="flex items-center">
              <button
                onClick={() => handleEditEvent(e)}
                onPointerEnter={() => prefetchEvent(e)}
                onFocus={() => prefetchEvent(e)}
                aria-label={`Edit ${e.event} event`}
                className="w-28 cursor-pointer rounded-lg border border-border bg-panel-raised px-3 py-2 text-left transition-colors hover:border-muted focus:outline-none focus-visible:border-muted"
              >
                <p className="truncate text-xs font-medium">{e.event}</p>

                <p className="mt-1 text-[10px] text-muted">
                  {loadingEventId === e.id
                    ? "Loading..."
                    : formatDateOnly(e.date)}
                </p>
              </button>
              {index < application.timeline.length - 1 && (
                <div className="w-6 border-t border-border" />
              )}
            </div>
          ))}
          <div className="w-6" />
          <button
            onClick={() => setIsAddingEvent(true)}
            aria-label={`Add timeline event to ${application.role} application`}
            className="flex w-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-panel-raised px-3 py-2 text-muted transition-colors hover:border-muted hover:text-foreground focus:outline-none focus-visible:border-muted"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isAddingEvent && (
        <AddTimelineEventModal
          title={`${application.role} · ${application.company}`}
          onCancel={() => setIsAddingEvent(false)}
          onSave={(event) => onAddTimelineEvent(application.id, event)}
        />
      )}

      {editingEvent && (
        <AddTimelineEventModal
          key={`${editingEvent.id}-${editingEvent.noteLoaded ? "loaded" : "loading"}`}
          title={`${application.role} · ${application.company}`}
          initialEvent={editingEvent}
          loadingDetails={
            loadingEventId === editingEvent.id && !editingEvent.noteLoaded
          }
          onCancel={() => {
            editingEventId.current = null;
            setEditingEvent(null);
          }}
          onSave={(event) =>
            onUpdateTimelineEvent(application.id, {
              ...event,
              id: editingEvent.id,
              noteLoaded: true,
            })
          }
          onDelete={() => {
            onDeleteTimelineEvent(application.id, editingEvent.id);
            editingEventId.current = null;
            setEditingEvent(null);
          }}
        />
      )}

      {isEditingApplication && (
        <EditApplicationModal
          application={application}
          onCancel={() => setIsEditingApplication(false)}
          onSave={(fields) => onUpdateApplication(application.id, fields)}
          onDelete={() => {
            onDelete(application.id);
            setIsEditingApplication(false);
          }}
        />
      )}
    </div>
  );
}
