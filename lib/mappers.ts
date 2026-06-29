import {
  Application,
  ApplicationStatus,
  TimelineEvent,
} from "@/types";

export type TimelineRow = {
  id: number;
  event: string;
  date: string;
  note?: string | null;
};

export type ApplicationRow = {
  id: number;
  role: string;
  company: string;
  location: string | null;
  status: string;
  follow_up: boolean;
  created_at: string;
  timeline_events?: TimelineRow[] | null;
};

export function mapTimelineEvent(row: TimelineRow): TimelineEvent {
  return {
    id: row.id,
    event: row.event,
    date: row.date,
    note: row.note ?? undefined,
    noteLoaded: "note" in row,
  };
}

export function mapApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    role: row.role,
    company: row.company,
    location: row.location ?? undefined,
    status: row.status as ApplicationStatus,
    followUp: row.follow_up,
    createdAt: row.created_at,
    timeline: (row.timeline_events ?? [])
      .map(mapTimelineEvent)
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}
