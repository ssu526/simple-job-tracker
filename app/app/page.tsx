import { Dashboard } from "@/components/Dashboard";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_COUNTS, EMPTY_PAGE, JobSearch, User } from "@/types";
import { getApplicationsPage, getStatusCounts } from "./actions";
import { AuthPage } from "@/components/AuthPage";

type JobSearchRow = {
  id: number;
  name: string;
  date_created: string;
  applications: { count: number }[] | null;
};

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // see if an error message was passed in the URL
    const { auth_error } = await searchParams;
    return <AuthPage authError={Boolean(auth_error)} />;
  }

  const { data: searches } = await supabase
    .from("job_searches")
    .select("id, name, date_created, applications ( count )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const jobSearches: JobSearch[] = ((searches ?? []) as JobSearchRow[]).map(
    (js) => ({
      id: js.id,
      name: js.name,
      dateCreated: js.date_created,
      applicationCount: js.applications?.[0]?.count ?? 0,
    }),
  );

  const initialUser: User = {
    id: user.id,
    name:
      user.user_metadata.full_name ??
      user.user_metadata.name ??
      user.email ??
      "You",
    email: user.email ?? "",
    jobSearches,
  };

  // Prefetch the first page + counts for the initially-selected search so the
  // dashboard renders populated instead of flashing a loading state.
  const firstSearch = jobSearches[0] ?? null;
  const [initialPage, initialCounts] = firstSearch
    ? await Promise.all([
        getApplicationsPage(firstSearch.id, { page: 0 }),
        getStatusCounts(firstSearch.id),
      ])
    : [EMPTY_PAGE, EMPTY_COUNTS];

  return (
    <Dashboard
      initialUser={initialUser}
      initialApplications={initialPage.applications}
      initialTotal={initialPage.total}
      initialCounts={initialCounts}
    />
  );
}
