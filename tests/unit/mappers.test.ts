import { describe, expect, it } from "vitest";
import {
  mapApplication,
  mapTimelineEvent,
  type ApplicationRow,
} from "@/lib/mappers";
import { ApplicationStatus } from "@/types";

describe("mapTimelineEvent", () => {
  it("maps a loaded note", () => {
    expect(
      mapTimelineEvent({
        id: 1,
        event: "Phone screen",
        date: "2026-06-10",
        note: "Went well",
      }),
    ).toEqual({
      id: 1,
      event: "Phone screen",
      date: "2026-06-10",
      note: "Went well",
      noteLoaded: true,
    });
  });

  it("maps a loaded null note to undefined", () => {
    expect(
      mapTimelineEvent({
        id: 2,
        event: "Interview",
        date: "2026-06-12",
        note: null,
      }),
    ).toEqual({
      id: 2,
      event: "Interview",
      date: "2026-06-12",
      note: undefined,
      noteLoaded: true,
    });
  });

  it("marks an omitted note as not loaded", () => {
    expect(
      mapTimelineEvent({
        id: 3,
        event: "Applied",
        date: "2026-06-01",
      }),
    ).toEqual({
      id: 3,
      event: "Applied",
      date: "2026-06-01",
      note: undefined,
      noteLoaded: false,
    });
  });
});

describe("mapApplication", () => {
  const row: ApplicationRow = {
    id: 10,
    role: "Frontend Engineer",
    company: "Acme",
    location: "Toronto",
    status: "In progress",
    follow_up: true,
    created_at: "2026-06-01T12:00:00.000Z",
    timeline_events: [
      { id: 3, event: "Interview", date: "2026-06-20" },
      { id: 1, event: "Applied", date: "2026-06-01" },
      { id: 2, event: "Phone screen", date: "2026-06-10" },
    ],
  };

  it("maps database fields and sorts timeline events chronologically", () => {
    expect(mapApplication(row)).toEqual({
      id: 10,
      role: "Frontend Engineer",
      company: "Acme",
      location: "Toronto",
      status: ApplicationStatus.InProgress,
      followUp: true,
      createdAt: "2026-06-01T12:00:00.000Z",
      timeline: [
        {
          id: 1,
          event: "Applied",
          date: "2026-06-01",
          note: undefined,
          noteLoaded: false,
        },
        {
          id: 2,
          event: "Phone screen",
          date: "2026-06-10",
          note: undefined,
          noteLoaded: false,
        },
        {
          id: 3,
          event: "Interview",
          date: "2026-06-20",
          note: undefined,
          noteLoaded: false,
        },
      ],
    });
  });

  it.each([undefined, null])(
    "maps a %s timeline to an empty array",
    (timeline_events) => {
      expect(mapApplication({ ...row, timeline_events }).timeline).toEqual([]);
    },
  );

  it("maps a null location to undefined", () => {
    expect(mapApplication({ ...row, location: null }).location).toBeUndefined();
  });
});
