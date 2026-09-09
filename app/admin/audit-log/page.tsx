import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AuditLogSearch from "@/components/AuditLogSearch";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
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

  const { data: logs } = await supabase
    .from("audit_log")
    .select("id, action, entity_type, entity_id, details, email_sent, created_at, actor_id")
    .order("created_at", { ascending: false })
    .limit(300);

  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean))];
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("users").select("id, full_name, university_email").in("id", actorIds)
      : { data: [] };
  const actorById = new Map((actors ?? []).map((a) => [a.id, a]));

  const enriched = (logs ?? []).map((log) => {
    const actor = log.actor_id ? actorById.get(log.actor_id) : null;
    const actorLabel = actor ? actor.full_name || actor.university_email : "System";
    return { ...log, actorLabel };
  });

  const filtered = q
    ? enriched.filter((log) => {
        const haystack = `${log.action} ${log.entity_type} ${log.entity_id ?? ""} ${log.actorLabel}`.toLowerCase();
        return haystack.includes(q.toLowerCase());
      })
    : enriched;

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">Audit log</h1>
      <p className="text-ink-soft text-sm mt-2">
        Every reportable action, who did it, and whether an email
        confirmation went out for it — the paper trail if a claim is ever
        disputed.
      </p>

      <AuditLogSearch initialQuery={q} />

      {q && (
        <p className="text-xs text-ink-soft mt-3">
          Showing {filtered.length} of {enriched.length} entries matching "{q}"
        </p>
      )}

      <table className="w-full mt-6 text-sm">
        <thead className="text-left text-ink-soft border-b border-line">
          <tr>
            <th className="py-2">When</th>
            <th className="py-2">Action</th>
            <th className="py-2">By</th>
            <th className="py-2">Entity</th>
            <th className="py-2">Emailed</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((log) => (
            <tr key={log.id} className="border-b border-line/60 align-top">
              <td className="py-3 text-ink-soft whitespace-nowrap">
                {new Date(log.created_at).toLocaleString("en-AU")}
              </td>
              <td className="py-3">{log.action}</td>
              <td className="py-3 text-ink-soft">{log.actorLabel}</td>
              <td className="py-3 font-mono text-xs">
                {log.entity_type} · {log.entity_id?.slice(0, 8)}
              </td>
              <td className="py-3">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-tag ${
                    log.email_sent
                      ? "bg-found-soft text-found"
                      : "bg-lost-soft text-lost"
                  }`}
                >
                  {log.email_sent ? "Sent" : "Not sent"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-ink-soft text-sm mt-6">No entries match your search.</p>
      )}
    </div>
  );
}
