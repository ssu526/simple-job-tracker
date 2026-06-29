"use server";

import { createClient, requireUser } from "@/lib/supabase/server";
import {
  Application,
  ApplicationFilter,
  ApplicationStatus,
  ApplicationsPage,
  JobSearch,
  PAGE_SIZE,
  StatusCounts,
  TimelineEvent,
  FOLLOW_UP_FILTER,
} from "@/types";
import {
  applicationFieldsSchema,
  applicationFollowUpSchema,
  applicationStatusSchema,
  jobSearchNameSchema,
  timelineEventSchema,
} from "@/lib/validation";
import {
  mapApplication,
  mapTimelineEvent,
  type ApplicationRow,
} from "@/lib/mappers";
import { redirect } from "next/navigation";
import {
  databaseError,
  setLogActor,
  setLogResource,
  withActionLog,
} from "@/lib/observability/logger";

// --- Auth(sign out) ---------------------------------------------------------------------
export async function signOut(): Promise<void> {
  await withActionLog(
    { action: "auth.sign_out", logSuccess: true },
    async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setLogActor(user.id);

      const { error } = await supabase.auth.signOut();
      if (error) throw databaseError(error);
    },
  );
  redirect("/");
}

// --- Job searches(create, delete) -------------------------------------------------------------
export async function createJobSearch(name: string): Promise<JobSearch> {
  return withActionLog(
    { action: "job_search.create", logSuccess: true },
    async () => {
      const parsedName = jobSearchNameSchema.parse(name);
      const { supabase, user } = await requireUser();

      const { data, error } = await supabase
        .from("job_searches")
        .insert({ name: parsedName, user_id: user.id })
        .select("id, name, date_created")
        .single();

      if (error) throw databaseError(error);
      setLogResource("job_search", data.id);

      return {
        id: data.id,
        name: data.name,
        dateCreated: data.date_created,
        applicationCount: 0,
      };
    },
  );
}

export async function deleteJobSearch(id: number): Promise<void> {
  return withActionLog(
    {
      action: "job_search.delete",
      logSuccess: true,
      resource: { resourceType: "job_search", resourceId: id },
    },
    async () => {
      const { supabase, user } = await requireUser();
      await requireJobSearchOwner(supabase, user.id, id);

      const { error } = await supabase
        .from("job_searches")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw databaseError(error);
    },
  );
}

// --- Applications(create, update, delete) -------------------------------------------------------------
export async function createApplication(
  jobSearchId: number,
  fields: { role: string; company: string; location?: string },
): Promise<Application> {
  return withActionLog(
    {
      action: "application.create",
      logSuccess: true,
      resource: { resourceType: "job_search", resourceId: jobSearchId },
    },
    async () => {
      const parsed = applicationFieldsSchema.parse(fields);
      const { supabase } = await requireUser();
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .rpc("create_application_with_initial_event", {
          p_job_search_id: jobSearchId,
          p_role: parsed.role,
          p_company: parsed.company,
          p_location: parsed.location ?? null,
          p_date: today,
        })
        .single();

      if (error) throw databaseError(error);
      setLogResource("application", data.application_id);

      return {
        id: data.application_id,
        role: data.role,
        company: data.company,
        location: data.location ?? undefined,
        status: data.status as ApplicationStatus,
        followUp: data.follow_up,
        createdAt: data.application_created_at,
        timeline: [
          mapTimelineEvent({
            id: data.event_id,
            event: data.event,
            date: data.event_date,
            note: data.event_note,
          }),
        ],
      };
    },
  );
}

export async function updateApplication(
  id: number,
  fields: { role: string; company: string; location?: string },
): Promise<void> {
  return withActionLog(
    {
      action: "application.update",
      logSuccess: true,
      resource: { resourceType: "application", resourceId: id },
    },
    async () => {
      const parsed = applicationFieldsSchema.parse(fields);
      const { supabase, user } = await requireUser();
      await requireApplicationOwner(supabase, user.id, id);

      const { error } = await supabase
        .from("applications")
        .update({
          role: parsed.role,
          company: parsed.company,
          location: parsed.location ?? null,
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw databaseError(error);
    },
  );
}

export async function updateApplicationStatus(
  id: number,
  status: ApplicationStatus,
): Promise<void> {
  return withActionLog(
    {
      action: "application.update_status",
      logSuccess: true,
      resource: { resourceType: "application", resourceId: id },
    },
    async () => {
      const parsedStatus = applicationStatusSchema.parse(status);
      const { supabase, user } = await requireUser();
      await requireApplicationOwner(supabase, user.id, id);

      const { error } = await supabase
        .from("applications")
        .update({ status: parsedStatus })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw databaseError(error);
    },
  );
}

export async function updateApplicationFollowUp(
  id: number,
  followUp: boolean,
): Promise<void> {
  return withActionLog(
    {
      action: "application.update_follow_up",
      logSuccess: true,
      resource: { resourceType: "application", resourceId: id },
    },
    async () => {
      const parsedFollowUp = applicationFollowUpSchema.parse(followUp);
      const { supabase, user } = await requireUser();
      await requireApplicationOwner(supabase, user.id, id);

      const { error } = await supabase
        .from("applications")
        .update({ follow_up: parsedFollowUp })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw databaseError(error);
    },
  );
}

export async function deleteApplication(id: number): Promise<void> {
  return withActionLog(
    {
      action: "application.delete",
      logSuccess: true,
      resource: { resourceType: "application", resourceId: id },
    },
    async () => {
      const { supabase, user } = await requireUser();
      await requireApplicationOwner(supabase, user.id, id);

      const { error } = await supabase
        .from("applications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw databaseError(error);
    },
  );
}

// --- Applications(retrieve, filter, pagination) -------------------------------------------------------------
export async function getApplicationsPage(
  jobSearchId: number,
  options: { page?: number; query?: string; status?: ApplicationFilter } = {},
): Promise<ApplicationsPage> {
  return withActionLog(
    {
      action: "application.list",
      logSuccess: false,
      resource: { resourceType: "job_search", resourceId: jobSearchId },
    },
    async () => {
      const { supabase, user } = await requireUser();
      await requireJobSearchOwner(supabase, user.id, jobSearchId);

      const page = Math.max(0, options.page ?? 0);
      const status = options.status ?? "All";
      const search = sanitizeSearch(options.query ?? "");

      let q = supabase
        .from("applications")
        .select(APPLICATION_COLUMNS, { count: "exact" })
        .eq("job_search_id", jobSearchId)
        .eq("user_id", user.id);

      if (status === FOLLOW_UP_FILTER) {
        q = q.eq("follow_up", true);
      } else if (status !== "All") {
        q = q.eq("status", status);
      }
      if (search) {
        q = q.or(
          `role.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%`,
        );
      }

      const from = page * PAGE_SIZE;
      const { data, count, error } = await q
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
    },
  );
}

// Counts are independent of the search query so filters show the full distribution.
export async function getStatusCounts(
  jobSearchId: number,
): Promise<StatusCounts> {
  return withActionLog(
    {
      action: "application.counts",
      logSuccess: false,
      resource: { resourceType: "job_search", resourceId: jobSearchId },
    },
    async () => {
      const { supabase } = await requireUser();
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
    },
  );
}

// --- Timeline events(create, get, update, delete) ----------------------------------------------------------
export async function createTimelineEvent(
  applicationId: number,
  event: Omit<TimelineEvent, "id">,
): Promise<TimelineEvent> {
  return withActionLog(
    {
      action: "timeline_event.create",
      logSuccess: true,
      resource: { resourceType: "application", resourceId: applicationId },
    },
    async () => {
      const parsed = timelineEventSchema.parse(event);
      const { supabase, user } = await requireUser();
      await requireApplicationOwner(supabase, user.id, applicationId);

      const { data, error } = await supabase
        .from("timeline_events")
        .insert({
          application_id: applicationId,
          user_id: user.id,
          event: parsed.event,
          date: parsed.date,
          note: parsed.note ?? null,
        })
        .select("id, event, date, note")
        .single();

      if (error) throw databaseError(error);
      setLogResource("timeline_event", data.id);
      return mapTimelineEvent(data);
    },
  );
}

export async function getTimelineEvent(id: number): Promise<TimelineEvent> {
  return withActionLog(
    {
      action: "timeline_event.get",
      logSuccess: false,
      resource: { resourceType: "timeline_event", resourceId: id },
    },
    async () => {
      const { supabase, user } = await requireUser();
      await requireTimelineEventOwner(supabase, user.id, id);

      const { data, error } = await supabase
        .from("timeline_events")
        .select("id, event, date, note")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw databaseError(error);
      return mapTimelineEvent(data);
    },
  );
}

export async function updateTimelineEvent(
  id: number,
  event: Omit<TimelineEvent, "id">,
): Promise<void> {
  return withActionLog(
    {
      action: "timeline_event.update",
      logSuccess: true,
      resource: { resourceType: "timeline_event", resourceId: id },
    },
    async () => {
      const parsed = timelineEventSchema.parse(event);
      const { supabase, user } = await requireUser();
      await requireTimelineEventOwner(supabase, user.id, id);

      const { error } = await supabase
        .from("timeline_events")
        .update({
          event: parsed.event,
          date: parsed.date,
          note: parsed.note ?? null,
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw databaseError(error);
    },
  );
}

export async function deleteTimelineEvent(id: number): Promise<void> {
  return withActionLog(
    {
      action: "timeline_event.delete",
      logSuccess: true,
      resource: { resourceType: "timeline_event", resourceId: id },
    },
    async () => {
      const { supabase, user } = await requireUser();
      await requireTimelineEventOwner(supabase, user.id, id);

      const { error } = await supabase
        .from("timeline_events")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw databaseError(error);
    },
  );
}

// --- Helpers -------------------------------------------------------------
const APPLICATION_COLUMNS =
  "id, role, company, location, status, follow_up, created_at, timeline_events ( id, event, date )";

function sanitizeSearch(query: string): string {
  return query.replace(/[,()\\*%_]/g, " ").trim();
}

function unauthorized(): Error {
  return new Error("Unauthorized");
}

async function requireJobSearchOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  jobSearchId: number,
): Promise<void> {
  const { data, error } = await supabase
    .from("job_searches")
    .select("id")
    .eq("id", jobSearchId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw databaseError(error);
  if (!data) throw unauthorized();
}

async function requireApplicationOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  applicationId: number,
): Promise<void> {
  const { data, error } = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw databaseError(error);
  if (!data) throw unauthorized();
}

async function requireTimelineEventOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  eventId: number,
): Promise<void> {
  const { data, error } = await supabase
    .from("timeline_events")
    .select("id")
    .eq("id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw databaseError(error);
  if (!data) throw unauthorized();
}
