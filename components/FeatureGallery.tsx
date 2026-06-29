import Image from "next/image";
import Link from "next/link";

export function FeatureGallery() {
  return (
    <section aria-labelledby="feature-gallery-title" className="w-full">
      <div className="mb-7 text-left">
        <div>
          <h1
            id="feature-gallery-title"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Every opportunity. Every step. One clear view.
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-strong sm:text-base">
            A simple timeline to map your applications, interviews, and
            follow-ups in one continuous journey.
          </p>
          <Link
            href="/app"
            className="mt-5 inline-flex rounded-md border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
          >
            Start Tracking
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-panel shadow-2xl">
        <Image
          src="/home.png"
          alt="SimpleJobTracker application dashboard"
          width={1583}
          height={789}
          priority
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="h-auto w-full"
        />
      </div>
    </section>
  );
}
