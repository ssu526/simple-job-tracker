"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen flex-1 flex-col items-center justify-center px-6 text-center">
      <h2 className="text-lg font-semibold tracking-tight">
        Couldn&apos;t load your applications
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Something went wrong while loading the dashboard. Try again in a moment.
      </p>
      <button
        onClick={() => unstable_retry()}
        className="mt-5 cursor-pointer rounded-md border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 focus:outline-none focus-visible:border-muted"
      >
        Try again
      </button>
    </div>
  );
}
