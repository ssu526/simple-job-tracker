import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApplicationStatus } from "@/types";
import {
  createTestUser,
  deleteTestUser,
  type TestUser,
} from "./supabase";

describe("Supabase API integration", () => {
  let owner: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    [owner, other] = await Promise.all([
      createTestUser("integration-owner"),
      createTestUser("integration-other"),
    ]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(owner), deleteTestUser(other)]);
  });

  it("supports owner CRUD and isolates rows from another user", async () => {
    const { data: search, error: searchError } = await owner.client
      .from("job_searches")
      .insert({ name: "Integration search", user_id: owner.user.id })
      .select("id")
      .single();
    expect(searchError).toBeNull();

    const { data: hiddenSearch, error: hiddenSearchError } = await other.client
      .from("job_searches")
      .select("id")
      .eq("id", search!.id);
    expect(hiddenSearchError).toBeNull();
    expect(hiddenSearch).toEqual([]);

    const { data: application, error: applicationError } = await owner.client
      .from("applications")
      .insert({
        job_search_id: search!.id,
        user_id: owner.user.id,
        role: "Engineer",
        company: "Acme",
        status: ApplicationStatus.Applied,
      })
      .select("id")
      .single();
    expect(applicationError).toBeNull();

    const { error: forbiddenApplicationError } = await other.client
      .from("applications")
      .insert({
        job_search_id: search!.id,
        user_id: other.user.id,
        role: "Intruder",
        company: "Blocked",
        status: ApplicationStatus.Applied,
      });
    expect(forbiddenApplicationError).not.toBeNull();

    const { data: event, error: eventError } = await owner.client
      .from("timeline_events")
      .insert({
        application_id: application!.id,
        user_id: owner.user.id,
        event: "Applied",
        date: "2026-06-26",
      })
      .select("id")
      .single();
    expect(eventError).toBeNull();

    const { data: hiddenApplications } = await other.client
      .from("applications")
      .select("id")
      .eq("id", application!.id);
    const { data: hiddenEvents } = await other.client
      .from("timeline_events")
      .select("id")
      .eq("id", event!.id);
    expect(hiddenApplications).toEqual([]);
    expect(hiddenEvents).toEqual([]);

    const { data: updated, error: updateError } = await owner.client
      .from("applications")
      .update({ status: ApplicationStatus.InProgress })
      .eq("id", application!.id)
      .select("status")
      .single();
    expect(updateError).toBeNull();
    expect(updated?.status).toBe(ApplicationStatus.InProgress);

    const { data: forbiddenUpdate, error: forbiddenUpdateError } =
      await other.client
        .from("applications")
        .update({ status: ApplicationStatus.Accepted })
        .eq("id", application!.id)
        .select("id");
    expect(forbiddenUpdateError).toBeNull();
    expect(forbiddenUpdate).toEqual([]);

    const { error: deleteError } = await owner.client
      .from("job_searches")
      .delete()
      .eq("id", search!.id);
    expect(deleteError).toBeNull();

    const { data: deletedApplications } = await owner.client
      .from("applications")
      .select("id")
      .eq("id", application!.id);
    const { data: deletedEvents } = await owner.client
      .from("timeline_events")
      .select("id")
      .eq("id", event!.id);
    expect(deletedApplications).toEqual([]);
    expect(deletedEvents).toEqual([]);
  });

  it("returns all status and overlapping follow-up counts in one RPC", async () => {
    const { data: search, error: searchError } = await owner.client
      .from("job_searches")
      .insert({ name: "Count search", user_id: owner.user.id })
      .select("id")
      .single();
    expect(searchError).toBeNull();

    const statuses = Object.values(ApplicationStatus);
    const rows = statuses.flatMap((status, index) => {
      const base = {
        job_search_id: search!.id,
        user_id: owner.user.id,
        role: `Role ${index}`,
        company: "Acme",
        status,
        follow_up: index < 2,
      };
      return status === ApplicationStatus.Applied
        ? [base, { ...base, role: "Second applied", follow_up: false }]
        : [base];
    });
    const { error: insertError } = await owner.client
      .from("applications")
      .insert(rows);
    expect(insertError).toBeNull();

    const { data: counts, error: countsError } = await owner.client
      .rpc("get_application_status_counts", {
        p_job_search_id: search!.id,
      })
      .single();
    expect(countsError).toBeNull();
    expect(counts).toEqual({
      all_count: 7,
      applied_count: 2,
      in_progress_count: 1,
      accepted_count: 1,
      rejected_count: 1,
      ghosted_count: 1,
      withdrawn_count: 1,
      follow_up_count: 2,
    });

    const { error: forbiddenCountsError } = await other.client.rpc(
      "get_application_status_counts",
      { p_job_search_id: search!.id },
    );
    expect(forbiddenCountsError?.message).toContain("Unauthorized");
  });
});
