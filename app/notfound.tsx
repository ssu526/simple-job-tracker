import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-wider text-muted">
        404
      </p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight">
        Page not found
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-5 cursor-pointer rounded-md border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 focus:outline-none focus-visible:border-muted"
      >
        Back home
      </Link>
    </div>
  );
}
