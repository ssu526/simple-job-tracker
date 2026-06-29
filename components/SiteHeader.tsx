import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);

  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="text-[20px] font-semibold tracking-tight neon-blue">
          SimpleJobTracker
        </span>
      </Link>
      <nav className="flex items-center gap-2">
        <Link
          href="/app"
          className="rounded-md border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          {isLoggedIn ? "Dashboard" : "Login"}
        </Link>
        <Link
          href="/about"
          className="rounded-md px-3 py-2 text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
        >
          About
        </Link>
      </nav>
    </header>
  );
}
