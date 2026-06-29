import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "About | Simple Job Tracker",
  description: "The story behind Simple Job Tracker.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <article className="w-full max-w-2xl rounded-2xl border border-border bg-panel p-8 text-left shadow-2xl sm:p-12">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-accent">
            About
          </p>

          <p className="mt-6 text-base leading-8 text-muted-strong sm:text-lg">
            Hi! I built this while I was job hunting because I got tired of
            managing everything in spreadsheets and documents. I just wanted a
            simple, minimalistic way to keep track of my applications. Hopefully
            you find it helpful too!{" "}
            <span className="text-yellow-200">ᓚ₍⑅^..^₎♡</span>
          </p>
        </article>
      </main>
    </div>
  );
}
