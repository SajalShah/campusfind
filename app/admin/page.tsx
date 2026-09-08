import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecomputeButton from "@/components/RecomputeButton";

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

  const { count } = await supabase
    .from("match_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("needs_admin_review", true);
  const clashCount = count ?? 0;

  const { data: matches } = await supabase
    .from("match_suggestions")
    .select(
      "id, total_score, category_score, description_score, location_score, date_score, colour_score, confidence_band, status, lost_report_id, found_report_id, created_at"
    )
    .eq("needs_admin_review", false)
    .order("total_score", { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Admin</h1>
          <p className="text-ink-soft text-sm mt-1">
            Matches are notified to students automatically — you're only
            needed for genuine clashes.
          </p>
        </div>
        <div className="flex gap-5 text-sm">
          <a href="/admin/reviews" className="text-ink-soft hover:text-ink underline">
            Reviews {clashCount > 0 ? `(${clashCount} pending)` : ""} →
          </a>
          <a href="/admin/audit-log" className="text-ink-soft hover:text-ink underline">
            View audit log →
          </a>
        </div>
      </div>

      {clashCount > 0 && (
        <div className="mt-6 ticket ml-4 p-4 border-lost">
          <p className="text-sm text-ink">
            <span className="font-medium text-lost">
              {clashCount} match{clashCount > 1 ? "es" : ""} need{clashCount === 1 ? "s" : ""} your review.
            </span>{" "}
            <a href="/admin/reviews" className="underline hover:text-lost">
              Go to Reviews →
            </a>
          </p>
        </div>
      )}

      <div className="mt-6">
        <RecomputeButton />
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-ink">
          Routine matches (log only)
        </h2>
        <p className="text-ink-soft text-sm mt-1">
          Already notified directly to both students — shown here for your
          records, no action needed.
        </p>
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
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Lost</th>
                <th className="py-2 pr-4">Found</th>
                <th className="py-2">Suggested</th>
              </tr>
            </thead>
            <tbody>
              {matches?.map((m) => (
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
                  <td className="py-3 pr-4 text-ink-soft capitalize">{m.status}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{m.lost_report_id.slice(0, 8)}</td>
                  <td className="py-3 pr-4 font-mono text-xs">{m.found_report_id.slice(0, 8)}</td>
                  <td className="py-3 text-ink-soft whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!matches || matches.length === 0) && (
            <p className="text-ink-soft text-sm mt-6">
              No matches yet — submit a lost and a found report, or click
              "Recompute all matches" above.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
