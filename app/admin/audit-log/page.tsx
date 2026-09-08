import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuditLogPage() {
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
    .select("id, action, entity_type, entity_id, details, email_sent, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">Audit log</h1>
      <p className="text-ink-soft text-sm mt-2">
        Every reportable action, and whether an email confirmation went out
        for it — the paper trail if a claim is ever disputed.
      </p>

      <table className="w-full mt-8 text-sm">
        <thead className="text-left text-ink-soft border-b border-line">
          <tr>
            <th className="py-2">When</th>
            <th className="py-2">Action</th>
            <th className="py-2">Entity</th>
            <th className="py-2">Emailed</th>
          </tr>
        </thead>
        <tbody>
          {logs?.map((log) => (
            <tr key={log.id} className="border-b border-line/60 align-top">
              <td className="py-3 text-ink-soft whitespace-nowrap">
                {new Date(log.created_at).toLocaleString("en-AU")}
              </td>
              <td className="py-3">{log.action}</td>
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
    </div>
  );
}
