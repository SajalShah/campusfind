"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResolveClashButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/resolve-clash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Couldn't resolve.");
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
        className="text-xs font-medium text-found border border-found rounded-tag px-2.5 py-1 hover:bg-found-soft disabled:opacity-50 focus-ring whitespace-nowrap"
      >
        {loading ? "Confirming…" : "Confirm this match"}
      </button>
      {error && <p className="text-xs text-lost mt-1">{error}</p>}
    </div>
  );
}
