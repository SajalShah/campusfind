"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Couldn't mark as claimed.");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-xs font-medium text-found border border-found rounded-tag px-3 py-1.5 hover:bg-found-soft disabled:opacity-50 focus-ring"
      >
        {loading ? "Marking…" : "Mark as claimed"}
      </button>
      {error && <p className="text-xs text-lost mt-1">{error}</p>}
    </div>
  );
}
