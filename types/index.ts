export interface User {
  id: string;
  name: string;
  email: string;
  jobSearches: JobSearch[];
}

export interface JobSearch {
  id: number;
  name: string;
  dateCreated: string;
  applicationCount: number;
}

export interface Application {
  id: number;
  role: string;
  company: string;
  location?: string;
  status: ApplicationStatus;
  followUp: boolean;
  createdAt: string;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: number;
  event: string;
  date: string;
  note?: string;
  noteLoaded?: boolean;
}

export enum ApplicationStatus {
  Applied = "Applied",
  InProgress = "In progress",
  Accepted = "Accepted",
  Rejected = "Rejected",
  Ghosted = "Ghosted",
  Withdrawn = "Withdrawn",
}

export const FOLLOW_UP_FILTER = "Follow up" as const;

export type ApplicationFilter =
  | ApplicationStatus
  | "All"
  | typeof FOLLOW_UP_FILTER;

export type StatusCounts = Record<ApplicationStatus, number> & {
  All: number;
  [FOLLOW_UP_FILTER]: number;
};

export interface ApplicationsPage {
  applications: Application[];
  total: number;
}

export const PAGE_SIZE = 50;

export const statusColors: Record<ApplicationStatus, string> = {
  [ApplicationStatus.Applied]: "bg-indigo-400/10 text-indigo-300",
  [ApplicationStatus.InProgress]: "bg-amber-400/10 text-amber-400",
  [ApplicationStatus.Accepted]: "bg-emerald-400/10 text-emerald-400",
  [ApplicationStatus.Rejected]: "bg-red-400/10 text-red-400",
  [ApplicationStatus.Ghosted]: "bg-zinc-400/10 text-zinc-300",
  [ApplicationStatus.Withdrawn]: "bg-sky-400/10 text-sky-300",
};

export const EMPTY_PAGE = { applications: [], total: 0 };

export const EMPTY_COUNTS = {
  All: 0,
  [ApplicationStatus.Applied]: 0,
  [ApplicationStatus.InProgress]: 0,
  [ApplicationStatus.Accepted]: 0,
  [ApplicationStatus.Rejected]: 0,
  [ApplicationStatus.Ghosted]: 0,
  [ApplicationStatus.Withdrawn]: 0,
  "Follow up": 0,
};
