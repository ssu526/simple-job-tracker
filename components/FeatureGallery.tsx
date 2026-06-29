"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "Track every opportunity",
    description:
      "Add applications in seconds and keep every role in one place.",
    videoSrc: "/applications.mov",
  },
  {
    number: "02",
    title: "Stay organized",
    description:
      "Search and filter by status so you can focus on your next move.",
    videoSrc: "/search.mov",
  },
  {
    number: "03",
    title: "Follow the journey",
    description:
      "Record interviews, follow-ups, and every step in the recruiting process.",
    videoSrc: "/timeline.mov",
  },
] as const;

export function FeatureGallery() {
  const [activeIndex, setActiveIndex] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const advanceTimeoutRef = useRef<number | null>(null);

  function clearAdvanceTimeout() {
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
  }

  function selectFeature(index: number) {
    if (index === activeIndex) return;
    clearAdvanceTimeout();
    setActiveIndex(index);
  }

  function showNextFeature() {
    selectFeature((activeIndex + 1) % features.length);
  }

  function handleVideoEnded() {
    clearAdvanceTimeout();
    advanceTimeoutRef.current = window.setTimeout(() => {
      showNextFeature();
      advanceTimeoutRef.current = null;
    }, 100);
  }

  useEffect(() => clearAdvanceTimeout, []);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;
      video.pause();
      video.currentTime = 0;

      if (index === activeIndex) {
        void video.play().catch(() => {
          // Autoplay can be blocked by browser preferences; the selected
          // preview remains visible and will play when permitted.
        });
      }
    });
  }, [activeIndex]);

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

      <div className="overflow-hidden rounded-2xl border border-border bg-panel text-left shadow-2xl">
        <div
          className="flex transform-gpu transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {features.map((feature, index) => (
            <div
              key={feature.number}
              id={`feature-panel-${feature.number}`}
              role="tabpanel"
              aria-labelledby={`feature-tab-${feature.number}`}
              aria-hidden={index !== activeIndex}
              className="w-full shrink-0"
            >
              <div className="relative aspect-video overflow-hidden border-b border-border-soft bg-panel-raised">
                <video
                  ref={(video) => {
                    videoRefs.current[index] = video;
                  }}
                  className="h-full w-full object-contain"
                  src={feature.videoSrc || undefined}
                  autoPlay={index === 0}
                  muted
                  playsInline
                  preload="metadata"
                  onEnded={() => {
                    if (index === activeIndex) handleVideoEnded();
                  }}
                  aria-label={`${feature.title} feature preview`}
                />

                {!feature.videoSrc && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_48%)]"
                    aria-hidden="true"
                  >
                    <div className="flex flex-col items-center gap-3 text-muted">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background/70">
                        <svg
                          viewBox="0 0 24 24"
                          className="ml-0.5 h-4 w-4 fill-current"
                        >
                          <path d="M8 5.5v13l10-6.5z" />
                        </svg>
                      </span>
                      <span className="text-xs font-medium uppercase tracking-[0.18em]">
                        Video coming soon
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 text-center sm:px-6 sm:py-5">
                <h2 className="text-lg font-semibold neon-blue">
                  {feature.title}
                </h2>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Application features"
        className="mt-5 flex items-center justify-center gap-2"
      >
        {features.map((feature, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={feature.number}
              id={`feature-tab-${feature.number}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`feature-panel-${feature.number}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectFeature(index)}
              aria-label={`Show ${feature.title}`}
              className="group flex h-8 w-8 items-center justify-center rounded-full"
            >
              <span
                className={`h-2.5 rounded-full transition-all ${
                  isActive
                    ? "w-7 bg-accent"
                    : "w-2.5 bg-muted group-hover:bg-muted-strong"
                }`}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
