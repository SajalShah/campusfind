import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  // RLS already blocks non-admins from reading match_suggestions/admin_actions
  // at the database layer — this check just gives a clean redirect instead
  // of an empty, confusing page.
  if (profile?.role !== "admin") redirect("/browse");

  const { data: matches } = await supabase
    .from("match_suggestions")
    .select(
      "id, total_score, status, lost_report_id, found_report_id, created_at"
    )
    .order("total_score", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-ink">Admin — match queue</h1>
        <a
          href="/admin/audit-log"
          className="text-sm text-ink-soft hover:text-ink underline"
        >
          View audit log →
        </a>
      </div>

      <table className="w-full mt-8 text-sm">
        <thead className="text-left text-ink-soft border-b border-line">
          <tr>
            <th className="py-2">Score</th>
            <th className="py-2">Lost report</th>
            <th className="py-2">Found report</th>
            <th className="py-2">Status</th>
            <th className="py-2">Suggested</th>
          </tr>
        </thead>
        <tbody>
          {matches?.map((m) => (
            <tr key={m.id} className="border-b border-line/60">
              <td className="py-3 font-medium text-brass-dark">
                {m.total_score}
              </td>
              <td className="py-3 font-mono text-xs">
                {m.lost_report_id.slice(0, 8)}
              </td>
              <td className="py-3 font-mono text-xs">
                {m.found_report_id.slice(0, 8)}
              </td>
              <td className="py-3">{m.status}</td>
              <td className="py-3 text-ink-soft">
                {new Date(m.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
