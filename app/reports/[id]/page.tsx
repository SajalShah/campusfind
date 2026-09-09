import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ACTION_LABELS: Record<string, string> = {
  report_created: "Report created",
  report_status_changed: "Status changed",
  match_suggested: "Match suggested",
  match_notified: "Match notified to both parties",
  match_clash_flagged: "Flagged as a clash — needs admin review",
  clash_resolved: "Clash resolved by admin",
  match_status_changed: "Match status changed",
};

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/reports/${id}`);

  const { data: report, error } = await supabase
    .from("item_reports")
    .select("id, report_type, category, description, campus_location, item_date, colour, status, reporter_id, created_at")
    .eq("id", id)
    .single();

  if (error || !report) notFound();

  // Owner, admin, or the other party in a confirmed match involving this
  // report can view it. RLS (participants_can_read_own_match) already
  // scopes the match query below to rows the current user is actually
  // part of — if nothing comes back, they're not a participant.
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "administrator";
  let isMatchParticipant = false;
  if (report.reporter_id !== user.id && !isAdmin) {
    const { data: participantMatch } = await supabase
      .from("match_suggestions")
      .select("id")
      .or(`lost_report_id.eq.${id},found_report_id.eq.${id}`)
      .eq("status", "pursued")
      .limit(1)
      .maybeSingle();
    isMatchParticipant = !!participantMatch;
  }
  if (report.reporter_id !== user.id && !isAdmin && !isMatchParticipant) redirect("/browse");

  const { data: reporter } = await supabase
    .from("users")
    .select("full_name, university_email")
    .eq("id", report.reporter_id)
    .single();

  // Pull every audit_log entry that touches this report, either directly
  // (entity_id) or as one side of a match (details->>lost/found_report_id).
  const { data: timeline } = await supabase
    .from("audit_log")
    .select("id, action, details, created_at, actor_id")
    .or(`entity_id.eq.${id},details->>lost_report_id.eq.${id},details->>found_report_id.eq.${id}`)
    .order("created_at", { ascending: true });

  const actorIds = [...new Set((timeline ?? []).map((t) => t.actor_id).filter(Boolean))];
  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("users").select("id, full_name, university_email").in("id", actorIds)
      : { data: [] };
  const actorById = new Map((actors ?? []).map((a) => [a.id, a]));

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <a href={isAdmin ? "/admin" : report.reporter_id === user.id ? "/my-reports" : "/messages"} className="text-sm text-ink-soft hover:text-ink">
        ← Back
      </a>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-ink-soft tracking-wide">
          {report.report_type.toUpperCase()} · CF-{report.id.slice(0, 5).toUpperCase()}
        </p>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-tag capitalize ${
            report.status === "claimed" ? "bg-found-soft text-found" : "bg-line/40 text-ink-soft"
          }`}
        >
          {report.status.replace(/_/g, " ")}
        </span>
      </div>
      <h1 className="font-serif text-3xl text-ink mt-2">{report.category}</h1>
      <p className="text-ink-soft mt-2">{report.description}</p>
      <p className="text-sm text-ink-soft mt-1">
        {report.campus_location} · {new Date(report.item_date).toLocaleDateString("en-AU")}
        {report.colour ? ` · ${report.colour}` : ""}
      </p>
      <p className="text-sm text-ink-soft mt-3">
        Reported by {reporter?.full_name || reporter?.university_email || "—"}
      </p>

      <h2 className="font-serif text-xl text-ink mt-10">Timeline</h2>
      <div className="mt-4 space-y-4">
        {timeline && timeline.length > 0 ? (
          timeline.map((t) => {
            const actor = t.actor_id ? actorById.get(t.actor_id) : null;
            return (
              <div key={t.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-brass mt-1.5 shrink-0" />
                  <span className="w-px flex-1 bg-line mt-1" />
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-ink">
                    {ACTION_LABELS[t.action] ?? t.action}
                  </p>
                  {actor && (
                    <p className="text-xs text-ink-soft">
                      by {actor.full_name || actor.university_email}
                    </p>
                  )}
                  <p className="text-xs text-ink-soft mt-0.5">
                    {new Date(t.created_at).toLocaleString("en-AU")}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-ink-soft text-sm">No recorded activity yet.</p>
        )}
      </div>
    </div>
  );
}
