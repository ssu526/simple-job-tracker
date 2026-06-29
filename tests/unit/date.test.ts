import { describe, expect, it } from "vitest";
import { formatDateOnly } from "@/lib/date";

describe("formatDateOnly", () => {
  it("formats a database date without using the runtime locale or timezone", () => {
    expect(formatDateOnly("2026-06-29")).toBe("6/29/2026");
  });

  it("returns an unexpected value unchanged", () => {
    expect(formatDateOnly("not-a-date")).toBe("not-a-date");
  });
});
