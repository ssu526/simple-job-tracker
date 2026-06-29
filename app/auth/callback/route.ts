import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  REQUEST_ID_HEADER,
  requestIdFrom,
} from "@/lib/observability/request-id";
import { logAuthEvent } from "@/lib/observability/logger";

/**
 * Handles the redirect from Google OAuth and magic-link emails. Exchanges the
 * one-time `code` for a session, then forwards the user to `next` (or /app).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const requestId = requestIdFrom(request.headers.get(REQUEST_ID_HEADER));
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/app";

  const supabase = await createClient();
  let authError: unknown;

  function redirectWithRequestId(url: string) {
    const response = NextResponse.redirect(url);
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      logAuthEvent({
        method: "code",
        outcome: "succeeded",
        requestId,
        userId: data.user?.id,
      });
      return redirectWithRequestId(`${origin}${next}`);
    }
    authError = error;
  }

  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      logAuthEvent({
        method: "otp",
        outcome: "succeeded",
        requestId,
        userId: data.user?.id,
      });
      return redirectWithRequestId(`${origin}${next}`);
    }
    authError = error;
  }

  logAuthEvent({
    error: authError ?? new Error("Missing authentication parameters"),
    method: code ? "code" : "otp",
    outcome: "failed",
    requestId,
  });
  return redirectWithRequestId(`${origin}/app?auth_error=1`);
}
