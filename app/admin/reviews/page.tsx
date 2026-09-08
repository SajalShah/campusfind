import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResolveClashButton from "@/components/ResolveClashButton";

export default async function AdminReviewsPage() {
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

  const { data: pending } = await supabase
    .from("match_suggestions")
    .select(
      "id, total_score, confidence_band, lost_report_id, found_report_id, created_at"
    )
    .eq("needs_admin_review", true)
    .order("total_score", { ascending: false });

  // History: every clash an admin has resolved, pulled from the audit
  // trail rather than match_suggestions directly — this is what actually
  // survives as a permanent record, since match_suggestions rows just
  // hold current state (pursued/dismissed), not who decided or when.
  const { data: resolvedLog } = await supabase
    .from("audit_log")
    .select("id, actor_id, entity_id, details, created_at")
    .eq("action", "clash_resolved")
    .order("created_at", { ascending: false });

  // Enrich with the admin's name and the confirmed match's score, where
  // still available (a match row could theoretically be deleted later —
  // the log entry should still stand on its own either way).
  const adminIds = [...new Set((resolvedLog ?? []).map((r) => r.actor_id).filter(Boolean))];
  const matchIds = [...new Set((resolvedLog ?? []).map((r) => r.entity_id).filter(Boolean))];

  const [{ data: admins }, { data: matches }] = await Promise.all([
    adminIds.length
      ? supabase.from("users").select("id, full_name, university_email").in("id", adminIds)
      : Promise.resolve({ data: [] }),
    matchIds.length
      ? supabase.from("match_suggestions").select("id, total_score, confidence_band").in("id", matchIds)
      : Promise.resolve({ data: [] }),
  ]);

  const adminById = new Map((admins ?? []).map((a) => [a.id, a]));
  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">Reviews</h1>
      <p className="text-ink-soft text-sm mt-2">
        Clashes needing your decision, and a permanent record of every
        clash you've already resolved.
      </p>

      <section className="mt-10">
        <h2 className="font-serif text-xl text-lost">
          Needs review — {pending?.length ?? 0}
        </h2>
        {pending && pending.length > 0 ? (
          <div className="mt-4 space-y-3">
            {pending.map((m) => (
              <div key={m.id} className="ticket ml-4 p-4 flex items-center justify-between gap-4">
                <div className="text-sm">
                  <p className="font-medium text-brass-dark">{m.total_score} — {m.confidence_band}</p>
                  <p className="text-ink-soft mt-1">
                    Lost CF-{m.lost_report_id.slice(0, 8)} × Found CF-{m.found_report_id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-ink-soft mt-1">
                    Suggested {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
                <ResolveClashButton matchId={m.id} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ink-soft text-sm mt-4">
            Nothing needs your review right now.
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-xl text-ink">Already reviewed</h2>
        {resolvedLog && resolvedLog.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full mt-4 text-sm">
              <thead className="text-left text-ink-soft border-b border-line">
                <tr>
                  <th className="py-2 pr-4">Resolved</th>
                  <th className="py-2 pr-4">By</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Lost</th>
                  <th className="py-2">Found</th>
                </tr>
              </thead>
              <tbody>
                {resolvedLog.map((r) => {
                  const admin = r.actor_id ? adminById.get(r.actor_id) : null;
                  const match = r.entity_id ? matchById.get(r.entity_id) : null;
                  const details = r.details as { lost_report_id?: string; found_report_id?: string } | null;
                  return (
                    <tr key={r.id} className="border-b border-line/60">
                      <td className="py-3 pr-4 text-ink-soft whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        {admin?.full_name || admin?.university_email || "—"}
                      </td>
                      <td className="py-3 pr-4 font-medium text-brass-dark">
                        {match?.total_score ?? "—"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs">
                        {details?.lost_report_id?.slice(0, 8) ?? "—"}
                      </td>
                      <td className="py-3 font-mono text-xs">
                        {details?.found_report_id?.slice(0, 8) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-ink-soft text-sm mt-4">
            No clashes have been resolved yet.
          </p>
        )}
      </section>
    </div>
  );
}
