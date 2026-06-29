import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import {
  REQUEST_ID_HEADER,
  requestIdFrom,
} from "@/lib/observability/request-id";

type ResourceContext = {
  resourceType: "job_search" | "application" | "timeline_event";
  resourceId?: number;
};

type ActionLogOptions = {
  action: string;
  logSuccess: boolean;
  resource?: ResourceContext;
  requestId?: string;
};

type ActionLogStore = {
  action: string;
  actorHash?: string;
  requestId: string;
  resource?: ResourceContext;
};

type SerializedError = {
  category: "authorization" | "constraint" | "database" | "internal" | "validation";
  code?: string;
  message: string;
  name: string;
};

type DatabaseErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
};

const actionLogStorage = new AsyncLocalStorage<ActionLogStore>();

function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

function environment(): string {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
}

function serializeError(error: unknown): SerializedError {
  const fallback = {
    category: "internal" as const,
    message: "Unknown error",
    name: "Error",
  };
  if (!(error instanceof Error)) return fallback;

  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  let category: SerializedError["category"] = "internal";

  if (error.name === "ZodError") category = "validation";
  else if (
    error.name.includes("Auth") ||
    error.message === "Unauthorized" ||
    code === "42501"
  ) {
    category = "authorization";
  } else if (code?.startsWith("23")) category = "constraint";
  else if (code) category = "database";

  return {
    category,
    ...(code ? { code } : {}),
    message: error.message,
    name: error.name,
  };
}

function writeLog(
  level: "error" | "info",
  event: string,
  store: ActionLogStore,
  fields: Record<string, unknown>,
): void {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    action: store.action,
    requestId: store.requestId,
    environment: environment(),
    ...(store.actorHash ? { actorHash: store.actorHash } : {}),
    ...(store.resource ?? {}),
    ...fields,
  };
  const line = JSON.stringify(record);

  if (level === "error") console.error(line);
  else console.info(line);
}

async function currentRequestId(explicit?: string): Promise<string> {
  if (explicit) return requestIdFrom(explicit);
  const requestHeaders = await headers();
  return requestIdFrom(requestHeaders.get(REQUEST_ID_HEADER));
}

export async function withActionLog<T>(
  options: ActionLogOptions,
  operation: () => Promise<T>,
): Promise<T> {
  const store: ActionLogStore = {
    action: options.action,
    requestId: await currentRequestId(options.requestId),
    resource: options.resource,
  };
  const startedAt = performance.now();

  return actionLogStorage.run(store, async () => {
    try {
      const result = await operation();
      if (options.logSuccess) {
        writeLog("info", "server_action.succeeded", store, {
          durationMs: Math.round(performance.now() - startedAt),
        });
      }
      return result;
    } catch (error) {
      writeLog("error", "server_action.failed", store, {
        durationMs: Math.round(performance.now() - startedAt),
        error: serializeError(error),
      });
      throw error;
    }
  });
}

export function setLogActor(userId: string): void {
  const store = actionLogStorage.getStore();
  if (store) store.actorHash = hashUserId(userId);
}

export function setLogResource(
  resourceType: ResourceContext["resourceType"],
  resourceId: number,
): void {
  const store = actionLogStorage.getStore();
  if (store) store.resource = { resourceType, resourceId };
}

export function databaseError(error: DatabaseErrorLike): Error {
  return Object.assign(new Error(error.message), {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

export function logAuthEvent({
  error,
  method,
  outcome,
  requestId,
  userId,
}: {
  error?: unknown;
  method: "code" | "otp" | "sign_out";
  outcome: "failed" | "succeeded";
  requestId: string;
  userId?: string;
}): void {
  const store: ActionLogStore = {
    action: `auth.${method}`,
    requestId: requestIdFrom(requestId),
    ...(userId ? { actorHash: hashUserId(userId) } : {}),
  };
  writeLog(outcome === "failed" ? "error" : "info", `auth.${outcome}`, store, {
    method,
    ...(error ? { error: serializeError(error) } : {}),
  });
}
