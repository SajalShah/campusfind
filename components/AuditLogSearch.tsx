"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuditLogSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/admin/audit-log?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2 mt-4">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by action, user, or report ID…"
        className="border border-line rounded-tag px-3 py-1.5 text-sm text-ink bg-white focus-ring w-80"
      />
      <button
        type="submit"
        className="bg-ink text-paper px-3 py-1.5 rounded-tag text-sm font-medium hover:bg-ink/90 focus-ring"
      >
        Search
      </button>
    </form>
  );
}
