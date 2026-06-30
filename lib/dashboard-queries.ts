import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ApplicationFilter,
  ApplicationsPage,
  ApplicationStatus,
  FOLLOW_UP_FILTER,
  PAGE_SIZE,
  StatusCounts,
} from "@/types";
import type { Database } from "@/types/database";
import {
  mapApplication,
  type ApplicationRow,
} from "@/lib/mappers";
import { databaseError } from "@/lib/observability/logger";

const APPLICATION_COLUMNS =
  "id, role, company, location, status, follow_up, created_at, timeline_events ( id, event, date )";

function sanitizeSearch(query: string): string {
  return query.replace(/[,()\\*%_]/g, " ").trim();
}

export async function queryApplicationsPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  jobSearchId: number,
  options: { page?: number; query?: string; status?: ApplicationFilter } = {},
): Promise<ApplicationsPage> {
  const page = Math.max(0, options.page ?? 0);
  const status = options.status ?? "All";
  const search = sanitizeSearch(options.query ?? "");

  let query = supabase
    .from("applications")
    .select(APPLICATION_COLUMNS, { count: "exact" })
    .eq("job_search_id", jobSearchId)
    .eq("user_id", userId);

  if (status === FOLLOW_UP_FILTER) {
    query = query.eq("follow_up", true);
  } else if (status !== "All") {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.or(
      `role.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%`,
    );
  }

  const from = page * PAGE_SIZE;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) throw databaseError(error);

  return {
    applications: (data ?? []).map((row) =>
      mapApplication(row as ApplicationRow),
    ),
    total: count ?? 0,
  };
}

export async function queryStatusCounts(
  supabase: SupabaseClient<Database>,
  jobSearchId: number,
): Promise<StatusCounts> {
  const { data, error } = await supabase
    .rpc("get_application_status_counts", {
      p_job_search_id: jobSearchId,
    })
    .single();

  if (error) throw databaseError(error);

  return {
    All: data.all_count,
    [ApplicationStatus.Applied]: data.applied_count,
    [ApplicationStatus.InProgress]: data.in_progress_count,
    [ApplicationStatus.Accepted]: data.accepted_count,
    [ApplicationStatus.Rejected]: data.rejected_count,
    [ApplicationStatus.Ghosted]: data.ghosted_count,
    [ApplicationStatus.Withdrawn]: data.withdrawn_count,
    [FOLLOW_UP_FILTER]: data.follow_up_count,
  };
}
