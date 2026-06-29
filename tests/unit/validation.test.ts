import { describe, expect, it } from "vitest";
import {
  applicationFieldsSchema,
  applicationFollowUpSchema,
  applicationStatusSchema,
  jobSearchNameSchema,
  LIMITS,
  limitText,
  timelineEventSchema,
} from "@/lib/validation";
import { ApplicationStatus } from "@/types";

describe("limitText", () => {
  it.each([
    ["", 5, ""],
    ["short", 10, "short"],
    ["exact", 5, "exact"],
    ["too long", 3, "too"],
  ])("limits %j to %i characters", (value, max, expected) => {
    expect(limitText(value, max)).toBe(expected);
  });
});

describe("jobSearchNameSchema", () => {
  it("trims a valid name", () => {
    expect(jobSearchNameSchema.parse("  Summer search  ")).toBe(
      "Summer search",
    );
  });

  it("accepts the exact limit", () => {
    expect(jobSearchNameSchema.parse("n".repeat(LIMITS.jobSearchName))).toHaveLength(
      LIMITS.jobSearchName,
    );
  });

  it.each(["", "   "])("rejects an empty name", (name) => {
    expect(() => jobSearchNameSchema.parse(name)).toThrow(
      "Job search name is required",
    );
  });

  it("rejects a name over the limit", () => {
    expect(() =>
      jobSearchNameSchema.parse("n".repeat(LIMITS.jobSearchName + 1)),
    ).toThrow(
      `Job search name must be ${LIMITS.jobSearchName} characters or fewer`,
    );
  });
});

describe("applicationFieldsSchema", () => {
  it("trims required and optional fields", () => {
    expect(
      applicationFieldsSchema.parse({
        role: "  Engineer  ",
        company: "  Acme  ",
        location: "  Toronto  ",
      }),
    ).toEqual({
      role: "Engineer",
      company: "Acme",
      location: "Toronto",
    });
  });

  it.each(["role", "company"] as const)(
    "requires a non-empty %s",
    (field) => {
      const input = { role: "Engineer", company: "Acme", [field]: "   " };
      expect(() => applicationFieldsSchema.parse(input)).toThrow(
        `${field === "role" ? "Role" : "Company"} is required`,
      );
    },
  );

  it.each([
    ["role", "Role", LIMITS.role],
    ["company", "Company", LIMITS.company],
    ["location", "Location", LIMITS.location],
  ] as const)("enforces the %s limit", (field, label, limit) => {
    const valid = {
      role: "Engineer",
      company: "Acme",
      location: "Toronto",
      [field]: "x".repeat(limit),
    };
    expect(applicationFieldsSchema.parse(valid)[field]).toHaveLength(limit);

    expect(() =>
      applicationFieldsSchema.parse({
        ...valid,
        [field]: "x".repeat(limit + 1),
      }),
    ).toThrow(`${label} must be ${limit} characters or fewer`);
  });

  it.each([undefined, "", "   "])(
    "normalizes an optional location of %j",
    (location) => {
      expect(
        applicationFieldsSchema.parse({
          role: "Engineer",
          company: "Acme",
          location,
        }).location,
      ).toBeUndefined();
    },
  );
});

describe("application status and follow-up schemas", () => {
  it.each(Object.values(ApplicationStatus))("accepts status %s", (status) => {
    expect(applicationStatusSchema.parse(status)).toBe(status);
  });

  it.each(["Interview", "Offer", "Unknown"])(
    "rejects unsupported status %s",
    (status) => {
      expect(() => applicationStatusSchema.parse(status)).toThrow();
    },
  );

  it.each([true, false])("accepts boolean follow-up value %s", (value) => {
    expect(applicationFollowUpSchema.parse(value)).toBe(value);
  });

  it("rejects a string follow-up value", () => {
    expect(() => applicationFollowUpSchema.parse("true")).toThrow();
  });
});

describe("timelineEventSchema", () => {
  const validEvent = {
    event: "Phone screen",
    date: "2026-06-26",
    note: "Promising conversation",
  };

  it("trims event details", () => {
    expect(
      timelineEventSchema.parse({
        event: "  Phone screen  ",
        date: validEvent.date,
        note: "  Promising conversation  ",
      }),
    ).toEqual(validEvent);
  });

  it("requires an event name", () => {
    expect(() =>
      timelineEventSchema.parse({ ...validEvent, event: "   " }),
    ).toThrow("Event is required");
  });

  it.each([
    ["event", "Event", LIMITS.event],
    ["note", "Note", LIMITS.note],
  ] as const)("enforces the %s limit", (field, label, limit) => {
    expect(
      timelineEventSchema.parse({
        ...validEvent,
        [field]: "x".repeat(limit),
      })[field],
    ).toHaveLength(limit);

    expect(() =>
      timelineEventSchema.parse({
        ...validEvent,
        [field]: "x".repeat(limit + 1),
      }),
    ).toThrow(`${label} must be ${limit} characters or fewer`);
  });

  it.each([undefined, "", "   "])(
    "normalizes an optional note of %j",
    (note) => {
      expect(
        timelineEventSchema.parse({ ...validEvent, note }).note,
      ).toBeUndefined();
    },
  );

  it("accepts a YYYY-MM-DD date", () => {
    expect(timelineEventSchema.parse(validEvent).date).toBe("2026-06-26");
  });

  it.each(["06/26/2026", "2026-6-26", "20260626", ""])(
    "rejects invalid date format %j",
    (date) => {
      expect(() => timelineEventSchema.parse({ ...validEvent, date })).toThrow(
        "Date must be in YYYY-MM-DD format",
      );
    },
  );
});
