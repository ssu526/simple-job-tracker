import { JobSearch, User } from "@/types";
import { LIMITS } from "@/lib/validation";
import { useEffect, useRef, useState } from "react";
import { LogoutIcon, PlusIcon, TrashIcon } from "./icons";
import Link from "next/link";

interface SidebarProps {
  user: User | null;
  selectedJobSearch: JobSearch | null;
  creatingSearchName: string | null;
  onSelectSearch: (search: JobSearch) => void;
  onCreateSearch: (name: string) => Promise<boolean>;
  onDeleteSearch: (id: number) => void | Promise<void>;
  onLogout: () => void | Promise<void>;
}

export function Sidebar({
  user,
  selectedJobSearch,
  creatingSearchName,
  onSelectSearch,
  onCreateSearch,
  onDeleteSearch,
  onLogout,
}: SidebarProps) {
  const [newSearchName, setNewSearchName] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchToDelete, setSearchToDelete] = useState<JobSearch | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the profile menu when clicking outside of it.
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!searchToDelete) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchToDelete(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchToDelete]);

  if (user == null) {
    return null;
  }

  async function handleNewSearch() {
    const name = newSearchName.trim();
    if (!name || creatingSearchName) return;
    const created = await onCreateSearch(name);
    if (created) setNewSearchName("");
  }

  function handleLogout() {
    setMenuOpen(false);
    onLogout();
  }

  function confirmDeleteSearch() {
    if (!searchToDelete) return;
    void onDeleteSearch(searchToDelete.id);
    setSearchToDelete(null);
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <aside className="flex h-auto w-full shrink-0 flex-row flex-wrap items-center border-b border-border bg-panel md:h-dvh md:w-64 md:flex-col md:flex-nowrap md:items-stretch md:border-b-0 md:border-r">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-3 md:px-5 md:py-5">
        <Link
          href="/"
          className="text-[20px] font-semibold tracking-tight neon-blue"
        >
          SimpleJobTracker
        </Link>
      </div>

      {/* Job searches */}
      <div className="order-3 w-full overflow-x-auto px-3 pb-3 md:order-none md:min-h-0 md:flex-1 md:overflow-x-hidden md:overflow-y-auto md:pb-0">
        <p className="hidden px-2 pb-2 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted md:block">
          Job Searches
        </p>

        <nav className="flex min-w-max gap-1 md:min-w-0 md:flex-col">
          {user.jobSearches.map((js) => {
            const active = js.id === selectedJobSearch?.id;
            return (
              <div
                key={js.id}
                className={`group flex max-w-52 shrink-0 items-center rounded-md text-sm transition-colors md:max-w-none ${
                  active
                    ? "border border-border bg-panel-raised text-accent"
                    : "text-muted-strong hover:bg-white/[0.03]"
                }`}
              >
                <button
                  onClick={() => onSelectSearch(js)}
                  className="flex min-w-0 flex-1 items-center justify-between px-3 py-2"
                >
                  <span className="truncate">{js.name}</span>
                </button>
                <span
                  className={`hidden px-1 text-xs md:inline md:group-hover:hidden ${active ? "text-accent" : "text-muted"}`}
                >
                  {js.applicationCount}
                </span>
                <button
                  onClick={() => setSearchToDelete(js)}
                  aria-label={`Delete ${js.name}`}
                  className="block shrink-0 px-2 py-2 text-muted transition-colors hover:text-red-400 md:hidden md:group-hover:block"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          <div className="flex w-44 shrink-0 items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted transition-colors focus-within:border-muted hover:border-muted hover:text-muted-strong md:mt-1 md:w-auto">
            {creatingSearchName ? (
              <span
                role="status"
                aria-label={`Creating ${creatingSearchName}`}
                className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-accent"
              />
            ) : (
              <PlusIcon className="h-3.5 w-3.5" />
            )}
            <input
              type="text"
              placeholder="New job search"
              value={newSearchName}
              disabled={creatingSearchName !== null}
              maxLength={LIMITS.jobSearchName}
              onChange={(e) => setNewSearchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleNewSearch();
                }
              }}
              className="w-full bg-transparent text-sm text-muted-strong placeholder:text-muted focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </nav>
      </div>

      {/* User */}
      <div
        ref={menuRef}
        className="relative ml-auto p-2 md:ml-0 md:border-t md:border-border md:p-3"
      >
        {menuOpen && (
          <div className="absolute right-2 top-full z-40 mt-1 w-44 overflow-hidden rounded-md border border-border bg-panel-raised py-1 shadow-lg md:bottom-full md:left-3 md:right-3 md:top-auto md:mb-1 md:mt-0 md:w-auto">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-white/[0.03]"
            >
              <LogoutIcon className="h-4 w-4 shrink-0" />
              Logout
            </button>
          </div>
        )}

        <button
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Open user menu"
          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.03]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
            {initials}
          </div>
          <div className="hidden min-w-0 flex-1 md:block">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
        </button>
      </div>

      {searchToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => setSearchToDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-search-title"
            aria-describedby="delete-search-description"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-border bg-panel-raised p-4 shadow-xl sm:p-6"
          >
            <h2
              id="delete-search-title"
              className="text-base font-semibold tracking-tight"
            >
              Delete job search?
            </h2>
            <p id="delete-search-description" className="mt-2 text-sm text-muted">
              Delete &ldquo;{searchToDelete.name}&rdquo; and all of its
              applications? This cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-2 border-t border-border-soft pt-4">
              <button
                autoFocus
                onClick={() => setSearchToDelete(null)}
                className="cursor-pointer rounded-md border border-border px-4 py-1.5 text-sm text-muted transition-colors hover:text-foreground focus:outline-none focus-visible:border-muted"
              >
                Keep it
              </button>
              <button
                onClick={confirmDeleteSearch}
                className="cursor-pointer rounded-md border border-red-400/30 bg-red-400/15 px-4 py-1.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-400/25 focus:outline-none focus-visible:border-red-400"
              >
                Delete job search
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
