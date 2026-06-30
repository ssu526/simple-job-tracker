export function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading dashboard"
      className="flex min-h-dvh flex-col md:flex-row"
    >
      <aside className="w-full shrink-0 border-b border-border bg-panel p-4 md:h-dvh md:w-64 md:border-b-0 md:border-r md:p-5">
        <p className="text-[20px] font-semibold tracking-tight neon-blue">
          SimpleJobTracker
        </p>
        <div className="mt-8 hidden space-y-3 md:block">
          <div className="h-3 w-24 animate-pulse rounded bg-panel-raised" />
          <div className="h-9 animate-pulse rounded-md bg-panel-raised" />
          <div className="h-9 animate-pulse rounded-md bg-panel-raised" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <div className="h-7 w-48 animate-pulse rounded bg-panel-raised" />
        <div className="mt-2 h-4 w-28 animate-pulse rounded bg-panel-raised" />
        <div className="mt-8 overflow-hidden rounded-lg border border-border bg-panel">
          <div className="h-14 animate-pulse border-b border-border-soft bg-panel-raised/40" />
          <div className="h-16 border-b border-border-soft" />
          <div className="h-20 animate-pulse border-b border-border-soft bg-panel-raised/20" />
          <div className="h-20 animate-pulse bg-panel-raised/10" />
        </div>
      </main>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}
