import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import type { Database } from "@/types/database";
import {
  REQUEST_ID_HEADER,
  requestIdFrom,
} from "@/lib/observability/request-id";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const requestId = requestIdFrom(request.headers.get(REQUEST_ID_HEADER));
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  const nextResponse = () =>
    NextResponse.next({ request: { headers: requestHeaders } });
  let supabaseResponse = nextResponse();

  const supbase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = nextResponse();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // refreshing session token
  // should not run code between creating the client and this call, or users may be randomly logged out.
  await supbase.auth.getUser();
  supabaseResponse.headers.set(REQUEST_ID_HEADER, requestId);
  return supabaseResponse;
}
