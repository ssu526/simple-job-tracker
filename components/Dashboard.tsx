"use client";

import ApplicationGrid from "@/components/ApplicationGrid";
import { Sidebar } from "@/components/Sidebar";
import {
  Application,
  ApplicationFilter,
  ApplicationStatus,
  JobSearch,
  PAGE_SIZE,
  StatusCounts,
  TimelineEvent,
  User,
  FOLLOW_UP_FILTER,
} from "@/types";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createApplication,
  createJobSearch,
  createTimelineEvent,
  deleteApplication,
  deleteJobSearch,
  deleteTimelineEvent,
  getApplicationsPage,
  getStatusCounts,
  getTimelineEvent,
  signOut,
  updateApplication,
  updateApplicationFollowUp,
  updateApplicationStatus,
  updateTimelineEvent,
} from "@/app/app/actions";

const EMPTY_COUNTS: StatusCounts = {
  All: 0,
  [ApplicationStatus.Applied]: 0,
  [ApplicationStatus.InProgress]: 0,
  [ApplicationStatus.Accepted]: 0,
  [ApplicationStatus.Rejected]: 0,
  [ApplicationStatus.Ghosted]: 0,
  [ApplicationStatus.Withdrawn]: 0,
  [FOLLOW_UP_FILTER]: 0,
};

interface DashboardProps {
  initialUser: User;
  initialApplications: Application[];
  initialTotal: number;
  initialCounts: StatusCounts;
}

function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) {
    return e.message;
  }
  return fallback;
}

export function Dashboard({
  initialUser,
  initialApplications,
  initialTotal,
  initialCounts,
}: DashboardProps) {
  const [searches, setSearches] = useState<JobSearch[]>(
    initialUser.jobSearches,
  );
  const [selectedId, setSelectedId] = useState<number | null>(
    initialUser.jobSearches[0]?.id ?? null,
  );

  const [applications, setApplications] =
    useState<Application[]>(initialApplications);
  const [total, setTotal] = useState(initialTotal);
  const [counts, setCounts] = useState<StatusCounts>(initialCounts);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationFilter>("All");
  const [loading, startLoadTransition] = useTransition();

  const user: User = { ...initialUser, jobSearches: searches };
  const selectedSearch = searches.find((s) => s.id === selectedId) ?? null;

  // Skip the very first page/counts fetch — that data was prefetched on the
  // server and passed in as props.
  const firstPageLoad = useRef(true);
  const firstCountsLoad = useRef(true);

  // Debounce the search box so we don't hit the server on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch a page of applications.
  // use a monotonic request counter to prevent older, slower requests from overwriting newer data.
  const requestRef = useRef(0);
  const loadApplications = useCallback(
    (searchId: number, p: number, q: string, status: ApplicationFilter) => {
      const reqId = ++requestRef.current;
      startLoadTransition(async () => {
        try {
          const res = await getApplicationsPage(searchId, {
            page: p,
            query: q,
            status,
          });
          if (requestRef.current !== reqId) return; // cancel previous request
          setApplications(res.applications);
          setTotal(res.total);
        } catch (e) {
          if (requestRef.current !== reqId) return;
          console.error(e);
          toast.error("Couldn't load applications");
        }
      });
    },
    [],
  );

  // Load a page whenever the selection / paging / filters change.
  useEffect(() => {
    if (firstPageLoad.current) {
      firstPageLoad.current = false;
      return;
    }
    // When no search is selected, the delete job search handler clears the view directly.
    if (selectedId == null) return;
    loadApplications(selectedId, page, debouncedQuery, statusFilter);
  }, [selectedId, page, debouncedQuery, statusFilter, loadApplications]);

  // Reload per-status counts when the selected search changes.
  useEffect(() => {
    if (firstCountsLoad.current) {
      firstCountsLoad.current = false;
      return;
    }
    if (selectedId == null) return;
    let cancelled = false;
    getStatusCounts(selectedId)
      .then((c) => !cancelled && setCounts(c))
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // --- Helpers --------------------------------------------------------------

  function patchApplication(id: number, patch: Partial<Application>) {
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  }

  function bumpCount(status: ApplicationStatus, delta: number) {
    setCounts((prev) => ({
      ...prev,
      [status]: Math.max(0, prev[status] + delta),
      All: Math.max(0, prev.All + delta),
    }));
  }

  function moveCount(from: ApplicationStatus, to: ApplicationStatus) {
    setCounts((prev) => ({
      ...prev,
      [from]: Math.max(0, prev[from] - 1),
      [to]: prev[to] + 1,
    }));
  }

  function bumpSearchCount(id: number, delta: number) {
    setSearches((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, applicationCount: Math.max(0, s.applicationCount + delta) }
          : s,
      ),
    );
  }

  // --- Job searches ---------------------------------------------------------

  function handleSelectSearch(search: JobSearch) {
    setSelectedId(search.id);
    setPage(0);
    setQuery("");
    setDebouncedQuery("");
    setStatusFilter("All");
  }

  async function handleCreateSearch(name: string) {
    try {
      const search = await createJobSearch(name);
      setSearches((prev) => [...prev, search]);
      handleSelectSearch(search);
      setApplications([]);
      setTotal(0);
      setCounts(EMPTY_COUNTS);
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't create job search"));
    }
  }

  async function handleDeleteSearch(id: number) {
    const snapshot = searches;
    const remaining = searches.filter((s) => s.id !== id);
    setSearches(remaining);
    if (selectedId === id) {
      const next = remaining[0] ?? null;
      if (next) {
        handleSelectSearch(next);
      } else {
        setSelectedId(null);
        setApplications([]);
        setTotal(0);
        setCounts(EMPTY_COUNTS);
      }
    }
    try {
      await deleteJobSearch(id);
    } catch (e) {
      setSearches(snapshot);
      toast.error(errorMessage(e, "Couldn't delete job search"));
    }
  }

  async function handleLogout() {
    await signOut();
  }

  // --- Applications ---------------------------------------------------------

  async function handleAddApplication(fields: {
    role: string;
    company: string;
    location?: string;
  }) {
    if (selectedId == null) return;
    try {
      await createApplication(selectedId, fields);
      bumpCount(ApplicationStatus.Applied, 1);
      bumpSearchCount(selectedId, 1);
      setPage(0);
      loadApplications(selectedId, 0, debouncedQuery, statusFilter);
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't add application"));
    }
  }

  async function handleUpdateStatus(
    applicationId: number,
    status: ApplicationStatus,
  ) {
    const app = applications.find((a) => a.id === applicationId);
    if (!app) return;
    const prevStatus = app.status;
    if (prevStatus === status) return;

    patchApplication(applicationId, { status });
    moveCount(prevStatus, status);
    try {
      await updateApplicationStatus(applicationId, status);
    } catch (e) {
      patchApplication(applicationId, { status: prevStatus });
      moveCount(status, prevStatus);
      toast.error(errorMessage(e, "Couldn't update status"));
    }
  }

  async function handleUpdateFollowUp(
    applicationId: number,
    followUp: boolean,
  ) {
    const app = applications.find((a) => a.id === applicationId);
    if (!app || app.followUp === followUp) return;

    const snapshot = applications;
    const previousTotal = total;
    patchApplication(applicationId, { followUp });
    setCounts((prev) => ({
      ...prev,
      [FOLLOW_UP_FILTER]: Math.max(
        0,
        prev[FOLLOW_UP_FILTER] + (followUp ? 1 : -1),
      ),
    }));

    if (statusFilter === FOLLOW_UP_FILTER && !followUp) {
      setApplications((prev) => prev.filter((a) => a.id !== applicationId));
      setTotal((value) => Math.max(0, value - 1));
    }

    try {
      await updateApplicationFollowUp(applicationId, followUp);
    } catch (e) {
      setApplications(snapshot);
      setTotal(previousTotal);
      setCounts((prev) => ({
        ...prev,
        [FOLLOW_UP_FILTER]: Math.max(
          0,
          prev[FOLLOW_UP_FILTER] + (followUp ? -1 : 1),
        ),
      }));
      toast.error(errorMessage(e, "Couldn't update follow-up"));
    }
  }

  async function handleUpdateApplication(
    applicationId: number,
    fields: { role: string; company: string; location?: string },
  ) {
    const app = applications.find((a) => a.id === applicationId);
    if (!app) return;
    const snapshot = {
      role: app.role,
      company: app.company,
      location: app.location,
    };

    patchApplication(applicationId, fields);
    try {
      await updateApplication(applicationId, fields);
    } catch (e) {
      patchApplication(applicationId, snapshot);
      toast.error(errorMessage(e, "Couldn't update application"));
    }
  }

  async function handleDeleteApplication(applicationId: number) {
    const app = applications.find((a) => a.id === applicationId);
    if (!app || selectedId == null) return;
    const snapshot = applications;

    setApplications((prev) => prev.filter((a) => a.id !== applicationId));
    setTotal((t) => Math.max(0, t - 1));
    bumpCount(app.status, -1);
    if (app.followUp) {
      setCounts((prev) => ({
        ...prev,
        [FOLLOW_UP_FILTER]: Math.max(0, prev[FOLLOW_UP_FILTER] - 1),
      }));
    }
    bumpSearchCount(selectedId, -1);
    try {
      await deleteApplication(applicationId);
    } catch (e) {
      setApplications(snapshot);
      setTotal((t) => t + 1);
      bumpCount(app.status, 1);
      if (app.followUp) {
        setCounts((prev) => ({
          ...prev,
          [FOLLOW_UP_FILTER]: prev[FOLLOW_UP_FILTER] + 1,
        }));
      }
      bumpSearchCount(selectedId, 1);
      toast.error(errorMessage(e, "Couldn't delete application"));
    }
  }

  // --- Timeline events ------------------------------------------------------
  // cache of requests that are currently in progress
  const timelineEventRequests = useRef(
    new Map<number, Promise<TimelineEvent>>(),
  );

  // load the notes for a timeline event exactly once, prevent duplicate network requests
  async function handleLoadTimelineEvent(
    applicationId: number,
    eventId: number,
    silent = false,
  ): Promise<TimelineEvent> {
    const cachedEvent = applications
      .find((application) => application.id === applicationId)
      ?.timeline.find((event) => event.id === eventId);
    if (cachedEvent?.noteLoaded) return cachedEvent;

    let request = timelineEventRequests.current.get(eventId);
    if (!request) {
      request = getTimelineEvent(eventId)
        .then((event) => {
          setApplications((prev) =>
            prev.map((application) =>
              application.id === applicationId
                ? {
                    ...application,
                    timeline: application.timeline.map((timelineEvent) =>
                      timelineEvent.id === event.id ? event : timelineEvent,
                    ),
                  }
                : application,
            ),
          );
          return event;
        })
        .finally(() => {
          timelineEventRequests.current.delete(eventId);
        });
      timelineEventRequests.current.set(eventId, request);
    }

    try {
      return await request;
    } catch (e) {
      if (!silent) {
        toast.error(errorMessage(e, "Couldn't load timeline note"));
      }
      throw e;
    }
  }

  async function handleAddTimelineEvent(
    applicationId: number,
    event: Omit<TimelineEvent, "id">,
  ) {
    try {
      const created = await createTimelineEvent(applicationId, event);
      setApplications((prev) =>
        prev.map((a) =>
          a.id === applicationId
            ? {
                ...a,
                timeline: [...a.timeline, created].sort((x, y) =>
                  x.date.localeCompare(y.date),
                ),
              }
            : a,
        ),
      );
    } catch (e) {
      toast.error(errorMessage(e, "Couldn't add timeline event"));
    }
  }

  async function handleUpdateTimelineEvent(
    applicationId: number,
    event: TimelineEvent,
  ) {
    const app = applications.find((a) => a.id === applicationId);
    const snapshot = app?.timeline;
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? {
              ...a,
              timeline: a.timeline
                .map((t) => (t.id === event.id ? event : t))
                .sort((x, y) => x.date.localeCompare(y.date)),
            }
          : a,
      ),
    );
    try {
      await updateTimelineEvent(event.id, event);
    } catch (e) {
      if (snapshot) patchApplication(applicationId, { timeline: snapshot });
      toast.error(errorMessage(e, "Couldn't update timeline event"));
    }
  }

  async function handleDeleteTimelineEvent(
    applicationId: number,
    eventId: number,
  ) {
    const app = applications.find((a) => a.id === applicationId);
    const snapshot = app?.timeline;
    setApplications((prev) =>
      prev.map((a) =>
        a.id === applicationId
          ? { ...a, timeline: a.timeline.filter((t) => t.id !== eventId) }
          : a,
      ),
    );
    try {
      await deleteTimelineEvent(eventId);
    } catch (e) {
      if (snapshot) patchApplication(applicationId, { timeline: snapshot });
      toast.error(errorMessage(e, "Couldn't delete timeline event"));
    }
  }

  // --- search query, status filter --------------------------------------------

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(0);
  }

  function handleFilterChange(filter: ApplicationFilter) {
    setStatusFilter(filter);
    setPage(0);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <Sidebar
        user={user}
        selectedJobSearch={selectedSearch}
        onSelectSearch={handleSelectSearch}
        onCreateSearch={handleCreateSearch}
        onDeleteSearch={handleDeleteSearch}
        onLogout={handleLogout}
      />
      <ApplicationGrid
        selectedJobSearch={selectedSearch}
        applications={applications}
        counts={counts}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        query={query}
        activeFilter={statusFilter}
        loading={loading}
        onQueryChange={handleQueryChange}
        onFilterChange={handleFilterChange}
        onPageChange={setPage}
        onAddApplication={handleAddApplication}
        onUpdateStatus={handleUpdateStatus}
        onUpdateFollowUp={handleUpdateFollowUp}
        onUpdateApplication={handleUpdateApplication}
        onLoadTimelineEvent={handleLoadTimelineEvent}
        onAddTimelineEvent={handleAddTimelineEvent}
        onUpdateTimelineEvent={handleUpdateTimelineEvent}
        onDeleteTimelineEvent={handleDeleteTimelineEvent}
        onDeleteApplication={handleDeleteApplication}
      />
    </div>
  );
}
