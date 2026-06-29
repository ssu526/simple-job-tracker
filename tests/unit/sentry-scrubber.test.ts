import type { Event } from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { scrubSentryEvent } from "@/lib/observability/sentry-scrubber";

describe("scrubSentryEvent", () => {
  it("filters auth secrets from absolute and relative request URLs", () => {
    const absolute = scrubSentryEvent({
      request: {
        url: "https://example.com/auth/callback?code=secret&next=%2Fapp",
      },
    } as Event);
    const relative = scrubSentryEvent({
      request: {
        url: "/auth/confirm?TOKEN_HASH=encoded%2Bsecret&type=email#done",
      },
    } as Event);

    expect(absolute.request?.url).toBe(
      "https://example.com/auth/callback?code=[Filtered]&next=%2Fapp",
    );
    expect(relative.request?.url).toBe(
      "/auth/confirm?TOKEN_HASH=[Filtered]&type=email#done",
    );
  });

  it("filters repeated sensitive parameters without changing other values", () => {
    const event = scrubSentryEvent({
      request: {
        url: "/auth/callback?code=first&code=second&token_hash=third&safe=keep",
      },
    } as Event);

    expect(event.request?.url).toBe(
      "/auth/callback?code=[Filtered]&code=[Filtered]&token_hash=[Filtered]&safe=keep",
    );
  });

  it("filters every supported query_string representation", () => {
    const stringEvent = scrubSentryEvent({
      request: { query_string: "code=secret&safe=keep" },
    } as Event);
    const objectEvent = scrubSentryEvent({
      request: {
        query_string: { CODE: "secret", safe: "keep" },
      },
    } as Event);
    const tupleEvent = scrubSentryEvent({
      request: {
        query_string: [
          ["token_hash", "secret"],
          ["safe", "keep"],
        ],
      },
    } as Event);

    expect(stringEvent.request?.query_string).toBe(
      "code=[Filtered]&safe=keep",
    );
    expect(objectEvent.request?.query_string).toEqual({
      CODE: "[Filtered]",
      safe: "keep",
    });
    expect(tupleEvent.request?.query_string).toEqual([
      ["token_hash", "[Filtered]"],
      ["safe", "keep"],
    ]);
  });

  it("filters breadcrumb and transaction span URLs", () => {
    const event = scrubSentryEvent({
      type: "transaction",
      transaction: "/auth/callback?code=transaction-secret",
      breadcrumbs: [
        {
          data: {
            from: "/sign-in",
            to: "/auth/confirm?token_hash=breadcrumb-secret",
          },
        },
      ],
      spans: [
        {
          data: {
            url: "https://example.com/auth/callback?code=span-secret",
            "http.query": "token_hash=query-secret&type=email",
          },
          description: "GET /auth/callback?code=description-secret",
          span_id: "1234567890abcdef",
          start_timestamp: 1,
          trace_id: "1234567890abcdef1234567890abcdef",
        },
      ],
    } as Event);

    expect(event.transaction).toBe(
      "/auth/callback?code=[Filtered]",
    );
    expect(event.breadcrumbs?.[0].data).toEqual({
      from: "/sign-in",
      to: "/auth/confirm?token_hash=[Filtered]",
    });
    expect(event.spans?.[0]).toMatchObject({
      description: "GET /auth/callback?code=[Filtered]",
      data: {
        url: "https://example.com/auth/callback?code=[Filtered]",
        "http.query": "token_hash=[Filtered]&type=email",
      },
    });
    expect(JSON.stringify(event)).not.toContain("secret");
  });

  it("safely returns events with malformed or missing URL data", () => {
    const malformed = {
      request: { url: "not a URL?code=%E0%A4%A&safe=keep" },
    } as Event;
    const empty = { message: "No request context" } as Event;

    expect(scrubSentryEvent(malformed)).toMatchObject({
      request: { url: "not a URL?code=[Filtered]&safe=keep" },
    });
    expect(scrubSentryEvent(empty)).toEqual(empty);
  });
});
