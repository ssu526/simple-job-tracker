"use client";

import {
  Application,
  ApplicationFilter,
  ApplicationStatus,
  JobSearch,
  StatusCounts,
  TimelineEvent,
  FOLLOW_UP_FILTER,
} from "@/types";
import { LIMITS, limitText } from "@/lib/validation";
import { BriefcaseIcon, SearchIcon } from "./icons";
import ApplicationCard from "./ApplicationCard";
import { useRef, useState } from "react";
import Link from "next/link";

type ApplicationGridProps = {
  selectedJobSearch: JobSearch | null;
  applications: Application[];
  counts: StatusCounts;
  total: number;
  page: number;
  pageSize: number;
  query: string;
  activeFilter: ApplicationFilter;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onFilterChange: (filter: ApplicationFilter) => void;
  onPageChange: (page: number) => void;
  onAddApplication: (fields: {
    role: string;
    company: string;
    location?: string;
  }) => void | Promise<void>;
  onUpdateStatus: (applicationId: number, status: ApplicationStatus) => void;
  onUpdateFollowUp: (applicationId: number, followUp: boolean) => void;
  onUpdateApplication: (
    applicationId: number,
    fields: { role: string; company: string; location?: string },
  ) => void;
  onAddTimelineEvent: (
    applicationId: number,
    event: Omit<TimelineEvent, "id">,
  ) => void | Promise<void>;
  onLoadTimelineEvent: (
    applicationId: number,
    eventId: number,
    silent?: boolean,
  ) => Promise<TimelineEvent>;
  onUpdateTimelineEvent: (applicationId: number, event: TimelineEvent) => void;
  onDeleteTimelineEvent: (applicationId: number, eventId: number) => void;
  onDeleteApplication: (applicationId: number) => void;
};

const FILTERS: ApplicationFilter[] = [
  "All",
  ApplicationStatus.Applied,
  ApplicationStatus.InProgress,
  ApplicationStatus.Accepted,
  ApplicationStatus.Rejected,
  ApplicationStatus.Ghosted,
  ApplicationStatus.Withdrawn,
  FOLLOW_UP_FILTER,
];

export default function ApplicationGrid({
  selectedJobSearch,
  applications,
  counts,
  total,
  page,
  pageSize,
  query,
  activeFilter,
  loading,
  onQueryChange,
  onFilterChange,
  onPageChange,
  onAddApplication,
  onUpdateStatus,
  onUpdateFollowUp,
  onUpdateApplication,
  onAddTimelineEvent,
  onLoadTimelineEvent,
  onUpdateTimelineEvent,
  onDeleteTimelineEvent,
  onDeleteApplication,
}: ApplicationGridProps) {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const scrollContainerRef = useRef<HTMLElement>(null);

  function handlePageChange(nextPage: number) {
    onPageChange(nextPage);
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }

  async function handleAddApplication() {
    const trimmedRole = role.trim();
    const trimmedCompany = company.trim();
    const trimmedLocation = location.trim();

    if (!trimmedRole || !trimmedCompany || saving) return;

    setSaving(true);
    try {
      await onAddApplication({
        role: trimmedRole,
        company: trimmedCompany,
        location: trimmedLocation || undefined,
      });
      setRole("");
      setCompany("");
      setLocation("");
    } finally {
      setSaving(false);
    }
  }

  if (!selectedJobSearch) {
    return (
      <main className="flex min-h-0 min-w-0 flex-1 flex-col px-4 sm:px-8">
        <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-panel text-muted">
            <BriefcaseIcon className="h-5 w-5" />
          </div>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">
            No job search selected
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Create a new job search from the sidebar to start tracking your
            applications.
          </p>
        </div>
      </main>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : page * pageSize + 1;
  const rangeEnd = Math.min(total, (page + 1) * pageSize);

  return (
    <main
      ref={scrollContainerRef}
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
    >
      {/* Header */}
      <header className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {selectedJobSearch.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            created {selectedJobSearch.dateCreated}
          </p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search roles, companies, or locations"
              className="w-full rounded-lg border border-border bg-panel py-2 pl-9 pr-3 text-sm placeholder:text-muted focus:border-muted focus:outline-none"
            />
          </div>
          <Link
            href="/about"
            className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
          >
            About
          </Link>
        </div>
      </header>

      {/* Panel */}
      <div className="mx-3 mb-3 rounded-lg border border-border bg-panel sm:mx-6 sm:mb-6 lg:mx-8 lg:mb-8">
        {/* Filter tabs */}
        <div className="scrollbar-thin flex items-center gap-1 overflow-x-auto border-b border-border-soft px-3 py-3 sm:flex-wrap sm:overflow-visible sm:px-4">
          {FILTERS.map((filter) => {
            const active = filter === activeFilter;
            return (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={`shrink-0 cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-panel-raised text-foreground"
                    : "text-muted hover:text-muted-strong"
                }`}
              >
                {filter} ({counts[filter] ?? 0})
              </button>
            );
          })}
          {/* {loading && (
            <span className="ml-auto text-xs text-muted">Loading…</span>
          )} */}
        </div>

        {/* Column header */}
        <div className="grid grid-cols-1 gap-3 border-b border-border-soft px-4 py-4 text-xs uppercase tracking-wider text-muted sm:grid-cols-2 lg:flex lg:items-center lg:gap-4 lg:px-5 lg:py-3">
          <input
            placeholder="Role"
            value={role}
            maxLength={LIMITS.role}
            onChange={(e) => setRole(limitText(e.target.value, LIMITS.role))}
            onKeyDown={(e) => e.key === "Enter" && handleAddApplication()}
            className="h-10 min-w-0 rounded-md border border-border bg-panel px-3 text-sm normal-case tracking-normal text-foreground placeholder:text-muted focus:border-muted focus:outline-none lg:w-80"
          />
          <input
            placeholder="Company"
            value={company}
            maxLength={LIMITS.company}
            onChange={(e) =>
              setCompany(limitText(e.target.value, LIMITS.company))
            }
            onKeyDown={(e) => e.key === "Enter" && handleAddApplication()}
            className="h-10 min-w-0 rounded-md border border-border bg-panel px-3 text-sm normal-case tracking-normal text-foreground placeholder:text-muted focus:border-muted focus:outline-none lg:w-50"
          />
          <input
            placeholder="Location (optional)"
            value={location}
            maxLength={LIMITS.location}
            onChange={(e) =>
              setLocation(limitText(e.target.value, LIMITS.location))
            }
            onKeyDown={(e) => e.key === "Enter" && handleAddApplication()}
            className="h-10 min-w-0 rounded-md border border-border bg-panel px-3 text-sm normal-case tracking-normal text-foreground placeholder:text-muted focus:border-muted focus:outline-none lg:w-50"
          />
          <button
            onClick={handleAddApplication}
            disabled={saving || !role.trim() || !company.trim()}
            className="h-10 cursor-pointer rounded-md border border-accent/20 bg-accent/10 px-4 text-xs font-semibold normal-case tracking-normal text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:border-muted sm:col-span-2 lg:col-span-1 lg:h-auto lg:py-1.5"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Rows */}
        <div className="divide-y divide-border-soft">
          {applications.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted">
              {loading ? "Loading…" : "No applications."}
            </p>
          ) : (
            applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onUpdateStatus={onUpdateStatus}
                onUpdateFollowUp={onUpdateFollowUp}
                onUpdateApplication={onUpdateApplication}
                onAddTimelineEvent={onAddTimelineEvent}
                onLoadTimelineEvent={onLoadTimelineEvent}
                onUpdateTimelineEvent={onUpdateTimelineEvent}
                onDeleteTimelineEvent={onDeleteTimelineEvent}
                onDelete={onDeleteApplication}
              />
            ))
          )}
        </div>

        {/* Pager */}
        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft px-4 py-3 text-sm text-muted sm:px-5">
            <span>
              {rangeStart}–{rangeEnd} of {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0 || loading}
                className="cursor-pointer rounded-md border border-border px-3 py-1 text-xs transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:border-muted"
              >
                Previous
              </button>
              <span className="hidden text-xs sm:inline">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page + 1 >= totalPages || loading}
                className="cursor-pointer rounded-md border border-border px-3 py-1 text-xs transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:border-muted"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
