"use client";

import { useState } from "react";

type ReportBrief = {
  category: string;
  description: string;
  campus_location: string;
} | null;

export default function ReviewHistoryRow({
  resolvedAt,
  adminName,
  score,
  lost,
  found,
}: {
  resolvedAt: string;
  adminName: string;
  score: number | string;
  lost: ReportBrief;
  found: ReportBrief;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ticket ml-4 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-line/10 focus-ring"
      >
        <div className="flex items-center gap-6 text-sm">
          <span className="text-ink-soft whitespace-nowrap">
            {new Date(resolvedAt).toLocaleString("en-AU")}
          </span>
          <span className="text-ink-soft">by {adminName}</span>
          <span className="font-medium text-brass-dark">{score}</span>
        </div>
        <span className="text-ink-soft text-xs">
          {expanded ? "Hide details ▲" : "Show details ▼"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-line px-4 py-4 grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-ink-soft uppercase tracking-wide">Lost report</p>
            {lost ? (
              <>
                <p className="text-ink mt-1 font-medium">{lost.category}</p>
                <p className="text-ink-soft mt-0.5">{lost.description}</p>
                <p className="text-ink-soft mt-0.5">{lost.campus_location}</p>
              </>
            ) : (
              <p className="text-ink-soft mt-1">Report no longer available.</p>
            )}
          </div>
          <div>
            <p className="text-xs text-ink-soft uppercase tracking-wide">Found report</p>
            {found ? (
              <>
                <p className="text-ink mt-1 font-medium">{found.category}</p>
                <p className="text-ink-soft mt-0.5">{found.description}</p>
                <p className="text-ink-soft mt-0.5">{found.campus_location}</p>
              </>
            ) : (
              <p className="text-ink-soft mt-1">Report no longer available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
