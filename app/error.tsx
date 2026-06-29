"use client";

import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Surface the error for observability. Swap for a reporting service later.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-6 text-center">
      <h2 className="text-lg font-semibold tracking-tight">
        Something went wrong
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        An unexpected error occurred. You can try again, or reload the page.
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
