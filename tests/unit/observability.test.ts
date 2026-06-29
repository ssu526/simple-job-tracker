import { afterEach, describe, expect, it, vi } from "vitest";
import {
  databaseError,
  logAuthEvent,
  setLogActor,
  setLogResource,
  withActionLog,
} from "@/lib/observability/logger";
import { requestIdFrom } from "@/lib/observability/request-id";

const REQUEST_ID = "4c2f4e49-b08a-4d89-9d63-44e295869728";
const USER_ID = "0060cfe4-6292-438d-a1db-8adecc6f2534";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("requestIdFrom", () => {
  it("preserves a valid UUID", () => {
    expect(requestIdFrom(REQUEST_ID)).toBe(REQUEST_ID);
  });

  it.each([null, undefined, "", "not-a-uuid", "x".repeat(200)])(
    "generates a UUID for %j",
    (value) => {
      expect(requestIdFrom(value)).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    },
  );
});

describe("withActionLog", () => {
  it("writes structured mutation success without exposing the user ID", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await withActionLog(
      {
        action: "application.create",
        logSuccess: true,
        requestId: REQUEST_ID,
      },
      async () => {
        setLogActor(USER_ID);
        setLogResource("application", 42);
        return "created";
      },
    );

    expect(result).toBe("created");
    expect(info).toHaveBeenCalledOnce();

    const line = info.mock.calls[0][0] as string;
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      level: "info",
      event: "server_action.succeeded",
      action: "application.create",
      requestId: REQUEST_ID,
      resourceType: "application",
      resourceId: 42,
    });
    expect(record.actorHash).toMatch(/^[0-9a-f]{16}$/);
    expect(record.durationMs).toBeGreaterThanOrEqual(0);
    expect(record.timestamp).toEqual(expect.any(String));
    expect(line).not.toContain(USER_ID);
  });

  it("suppresses successful read logs", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await withActionLog(
      {
        action: "application.list",
        logSuccess: false,
        requestId: REQUEST_ID,
      },
      async () => [],
    );

    expect(info).not.toHaveBeenCalled();
  });

  it("classifies and rethrows database constraint failures", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = databaseError({
      code: "23514",
      message: "constraint failed",
    });

    await expect(
      withActionLog(
        {
          action: "application.create",
          logSuccess: true,
          requestId: REQUEST_ID,
        },
        async () => {
          throw error;
        },
      ),
    ).rejects.toBe(error);

    const record = JSON.parse(errorLog.mock.calls[0][0] as string);
    expect(record).toMatchObject({
      level: "error",
      event: "server_action.failed",
      action: "application.create",
      requestId: REQUEST_ID,
      error: {
        category: "constraint",
        code: "23514",
        message: "constraint failed",
      },
    });
  });
});

describe("logAuthEvent", () => {
  it("logs a hashed actor and safe auth method", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    logAuthEvent({
      method: "code",
      outcome: "succeeded",
      requestId: REQUEST_ID,
      userId: USER_ID,
    });

    const line = info.mock.calls[0][0] as string;
    const record = JSON.parse(line);
    expect(record).toMatchObject({
      event: "auth.succeeded",
      action: "auth.code",
      method: "code",
      requestId: REQUEST_ID,
    });
    expect(record.actorHash).toMatch(/^[0-9a-f]{16}$/);
    expect(line).not.toContain(USER_ID);
  });
});
