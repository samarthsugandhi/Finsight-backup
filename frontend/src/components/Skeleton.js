"use client";

/**
 * Skeleton loading placeholder components.
 * Drop-in replacements for content areas while data is fetching.
 * Uses the .skeleton CSS class (defined in globals.css) for shimmer animation.
 */

/** Single skeleton block */
export function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Skeleton card matching the standard FinSight card layout */
export function SkeletonCard({ rows = 3 }) {
  return (
    <div
      className="rounded-2xl border border-line bg-paper-raised p-5 shadow-sm space-y-3"
      aria-busy="true"
      aria-label="Loading…"
    >
      {/* Title bar */}
      <SkeletonBlock className="h-4 w-2/5" />
      {/* Value */}
      <SkeletonBlock className="h-7 w-3/5" />
      {/* Extra rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBlock key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

/** Row of skeleton stat cards */
export function SkeletonStatRow({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} rows={1} />
      ))}
    </div>
  );
}

/** Skeleton list item */
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 py-3" aria-hidden="true">
      <SkeletonBlock className="h-9 w-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3 w-3/4" />
        <SkeletonBlock className="h-2.5 w-1/2" />
      </div>
      <SkeletonBlock className="h-4 w-16 shrink-0" />
    </div>
  );
}

/** Full page skeleton for dashboard */
export function SkeletonDashboard() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 space-y-6" aria-label="Loading dashboard…">
      <SkeletonStatRow count={3} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={4} />
      </div>
      <SkeletonCard rows={6} />
    </div>
  );
}

