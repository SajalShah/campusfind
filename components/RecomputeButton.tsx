"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RecomputeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/match", { method: "POST" });
      const data = await res.json();
      setResult(`Checked ${data.pairsEvaluated} pairs, wrote ${data.matchesWritten} matches.`);
      router.refresh();
    } catch {
      setResult("Something went wrong — check the server logs.");
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="bg-brass text-ink px-4 py-2 rounded-tag text-sm font-medium hover:bg-brass/90 disabled:opacity-50 focus-ring"
      >
        {loading ? "Recomputing…" : "Recompute all matches"}
      </button>
      {result && <span className="text-xs text-ink-soft">{result}</span>}
    </div>
  );
}
