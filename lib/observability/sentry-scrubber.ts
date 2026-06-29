import type { Event } from "@sentry/nextjs";

const FILTERED = "[Filtered]";
const SENSITIVE_QUERY_PARAMETERS = new Set(["code", "token_hash"]);
const URL_FIELDS = new Set(["from", "to", "url"]);
const QUERY_FIELDS = new Set(["http.query", "query", "query_string"]);

function decodedParameterName(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " ")).toLowerCase();
  } catch {
    return value.toLowerCase();
  }
}

function scrubQueryString(value: string): string {
  return value
    .split("&")
    .map((part) => {
      const equalsIndex = part.indexOf("=");
      const name = equalsIndex === -1 ? part : part.slice(0, equalsIndex);

      return SENSITIVE_QUERY_PARAMETERS.has(decodedParameterName(name))
        ? `${name}=${FILTERED}`
        : part;
    })
    .join("&");
}

function scrubUrl(value: string): string {
  const fragmentIndex = value.indexOf("#");
  const fragment = fragmentIndex === -1 ? "" : value.slice(fragmentIndex);
  const withoutFragment =
    fragmentIndex === -1 ? value : value.slice(0, fragmentIndex);
  const queryIndex = withoutFragment.indexOf("?");

  if (queryIndex === -1) return value;

  return (
    withoutFragment.slice(0, queryIndex + 1) +
    scrubQueryString(withoutFragment.slice(queryIndex + 1)) +
    fragment
  );
}

function scrubQueryParameters<T>(
  value: T,
): T {
  if (typeof value === "string") return scrubQueryString(value) as T;

  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (
        Array.isArray(entry) &&
        entry.length >= 2 &&
        typeof entry[0] === "string"
      ) {
        return [
          entry[0],
          SENSITIVE_QUERY_PARAMETERS.has(decodedParameterName(entry[0]))
            ? FILTERED
            : entry[1],
        ];
      }
      return entry;
    }) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        SENSITIVE_QUERY_PARAMETERS.has(decodedParameterName(key))
          ? FILTERED
          : entryValue,
      ]),
    ) as T;
  }

  return value;
}

function scrubTelemetryData(
  data: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      const normalizedKey = key.toLowerCase();

      if (typeof value === "string" && URL_FIELDS.has(normalizedKey)) {
        return [key, scrubUrl(value)];
      }
      if (QUERY_FIELDS.has(normalizedKey)) {
        return [key, scrubQueryParameters(value)];
      }
      return [key, value];
    }),
  );
}

export function scrubSentryEvent<T extends Event>(event: T): T {
  return {
    ...event,
    ...(event.transaction
      ? { transaction: scrubUrl(event.transaction) }
      : {}),
    ...(event.request
      ? {
          request: {
            ...event.request,
            ...(event.request.url
              ? { url: scrubUrl(event.request.url) }
              : {}),
            ...(event.request.query_string
              ? {
                  query_string: scrubQueryParameters(
                    event.request.query_string,
                  ),
                }
              : {}),
          },
        }
      : {}),
    ...(event.breadcrumbs
      ? {
          breadcrumbs: event.breadcrumbs.map((breadcrumb) => ({
            ...breadcrumb,
            ...(breadcrumb.data
              ? { data: scrubTelemetryData(breadcrumb.data) }
              : {}),
          })),
        }
      : {}),
    ...(event.spans
      ? {
          spans: event.spans.map((span) => ({
            ...span,
            ...(span.description
              ? { description: scrubUrl(span.description) }
              : {}),
            data: scrubTelemetryData(span.data),
          })),
        }
      : {}),
  };
}
