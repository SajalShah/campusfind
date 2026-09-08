import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecomputeButton from "@/components/RecomputeButton";
import ResolveClashButton from "@/components/ResolveClashButton";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "administrator") redirect("/browse");

  const { data: matches } = await supabase
    .from("match_suggestions")
    .select(
      "id, total_score, category_score, description_score, location_score, date_score, colour_score, confidence_band, status, needs_admin_review, lost_report_id, found_report_id, created_at"
    )
    .order("total_score", { ascending: false });

  const clashes = matches?.filter((m) => m.needs_admin_review) ?? [];
  const routine = matches?.filter((m) => !m.needs_admin_review) ?? [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Admin</h1>
          <p className="text-ink-soft text-sm mt-1">
            Matches are notified to students automatically — you're only
            needed here when a report has more than one plausible match.
          </p>
        </div>
        <a
          href="/admin/audit-log"
          className="text-sm text-ink-soft hover:text-ink underline"
        >
          View audit log →
        </a>
      </div>

      <div className="mt-6">
        <RecomputeButton />
      </div>

      {clashes.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-xl text-lost">
            Needs your review — {clashes.length} clash{clashes.length > 1 ? "es" : ""}
          </h2>
          <p className="text-ink-soft text-sm mt-1">
            More than one plausible match exists for at least one of these
            reports. These weren't auto-notified — verify with both parties
            before connecting anyone.
          </p>
          <MatchTable matches={clashes} showResolve />
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-xl text-ink">
          Routine matches (log only)
        </h2>
        <p className="text-ink-soft text-sm mt-1">
          Already notified directly to both students — shown here for your
          records, no action needed.
        </p>
        <MatchTable matches={routine} />
        {routine.length === 0 && (
          <p className="text-ink-soft text-sm mt-6">
            No matches yet — submit a lost and a found report, or click
            "Recompute all matches" above.
          </p>
        )}
      </section>
    </div>
  );
}

function MatchTable({
  matches,
  showResolve = false,
}: {
  matches: NonNullable<Awaited<ReturnType<typeof getMatches>>>;
  showResolve?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full mt-4 text-sm">
        <thead className="text-left text-ink-soft border-b border-line">
          <tr>
            <th className="py-2 pr-4">Total</th>
            <th className="py-2 pr-4">Cat</th>
            <th className="py-2 pr-4">Desc</th>
            <th className="py-2 pr-4">Loc</th>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Colour</th>
            <th className="py-2 pr-4">Confidence</th>
            <th className="py-2 pr-4">Lost</th>
            <th className="py-2 pr-4">Found</th>
            <th className="py-2 pr-4">Suggested</th>
            {showResolve && <th className="py-2">Action</th>}
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id} className="border-b border-line/60">
              <td className="py-3 pr-4 font-medium text-brass-dark">{m.total_score}</td>
              <td className="py-3 pr-4 text-ink-soft">{(m.category_score * 100).toFixed(0)}%</td>
              <td className="py-3 pr-4 text-ink-soft">{(m.description_score * 100).toFixed(0)}%</td>
              <td className="py-3 pr-4 text-ink-soft">{(m.location_score * 100).toFixed(0)}%</td>
              <td className="py-3 pr-4 text-ink-soft">{(m.date_score * 100).toFixed(0)}%</td>
              <td className="py-3 pr-4 text-ink-soft">{(m.colour_score * 100).toFixed(0)}%</td>
              <td className="py-3 pr-4">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-tag ${
                    m.confidence_band === "likely"
                      ? "bg-found-soft text-found"
                      : "bg-line/40 text-ink-soft"
                  }`}
                >
                  {m.confidence_band}
                </span>
              </td>
              <td className="py-3 pr-4 font-mono text-xs">{m.lost_report_id.slice(0, 8)}</td>
              <td className="py-3 pr-4 font-mono text-xs">{m.found_report_id.slice(0, 8)}</td>
              <td className="py-3 pr-4 text-ink-soft whitespace-nowrap">
                {new Date(m.created_at).toLocaleString()}
              </td>
              {showResolve && (
                <td className="py-3">
                  <ResolveClashButton matchId={m.id} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Type helper only — never called at runtime.
async function getMatches() {
  return null as unknown as {
    id: string;
    total_score: number;
    category_score: number;
    description_score: number;
    location_score: number;
    date_score: number;
    colour_score: number;
    confidence_band: string;
    status: string;
    needs_admin_review: boolean;
    lost_report_id: string;
    found_report_id: string;
    created_at: string;
  }[];
}
