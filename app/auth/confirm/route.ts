import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  REQUEST_ID_HEADER,
  requestIdFrom,
} from "@/lib/observability/request-id";
import { logAuthEvent } from "@/lib/observability/logger";

/**
 * Handles magic-link / email-OTP confirmations. Supabase's default email
 * template links here with a `token_hash` and `type`, which we verify to
 * establish the session. (OAuth uses /auth/callback instead.)
 */

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const requestId = requestIdFrom(request.headers.get(REQUEST_ID_HEADER));
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/app";
  let authError: unknown;

  function redirectWithRequestId(url: string) {
    const response = NextResponse.redirect(url);
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  if (token_hash && type) {
    const supabase = await createClient();
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
    method: "otp",
    outcome: "failed",
    requestId,
  });
  return redirectWithRequestId(`${origin}/app?auth_error=1`);
}
