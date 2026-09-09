import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SendMessageBox from "@/components/SendMessageBox";
import Avatar from "@/components/Avatar";

export default async function MessageThreadPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/messages/${matchId}`);

  // RLS (is_match_participant) enforces that only the two matched
  // reporters — or an admin — can reach this row at all.
  const { data: match, error: matchError } = await supabase
    .from("match_suggestions")
    .select("id, total_score, lost_report_id, found_report_id")
    .eq("id", matchId)
    .single();

  if (matchError || !match) notFound();

  const { data: lostReport } = await supabase
    .from("item_reports")
    .select("id, category, description, reporter_id")
    .eq("id", match.lost_report_id)
    .single();
  const { data: foundReport } = await supabase
    .from("item_reports")
    .select("id, category, description, reporter_id")
    .eq("id", match.found_report_id)
    .single();

  const isLostSide = lostReport?.reporter_id === user.id;
  const myReport = isLostSide ? lostReport : foundReport;
  const otherReport = isLostSide ? foundReport : lostReport;

  const [{ data: otherProfile }, { data: myProfile }] = await Promise.all([
    otherReport?.reporter_id
      ? supabase.from("public_profiles").select("full_name, avatar_color").eq("id", otherReport.reporter_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("public_profiles").select("full_name, avatar_color").eq("id", user.id).single(),
  ]);

  const otherName = otherProfile?.full_name || "the other student";

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  // Mark incoming messages as read on load.
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("match_id", matchId)
    .neq("sender_id", user.id)
    .is("read_at", null);

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <a href="/messages" className="text-sm text-ink-soft hover:text-ink">
        ← Back to messages
      </a>

      <div className="flex items-center gap-3 mt-4">
        <Avatar name={otherProfile?.full_name} color={otherProfile?.avatar_color} size={44} />
        <div>
          <h1 className="font-serif text-xl text-ink leading-tight">{otherName}</h1>
          <p className="text-ink-soft text-xs">
            AI matched, {match.total_score}/100 confidence
          </p>
        </div>
      </div>

      {/* Both sides of the match, clearly labeled and clickable through to
          each item's current status — stays useful right up until it's
          marked claimed. */}
      <div className="grid sm:grid-cols-2 gap-2 mt-4">
        {myReport && (
          <a
            href={`/reports/${myReport.id}`}
            className="text-xs bg-line/20 hover:bg-line/30 rounded-tag px-3 py-2 transition-colors"
          >
            <span className="text-ink-soft">Your report</span>
            <p className="text-ink font-medium mt-0.5">
              {myReport.category} — {myReport.description}
            </p>
          </a>
        )}
        {otherReport && (
          <a
            href={`/reports/${otherReport.id}`}
            className="text-xs bg-found-soft hover:bg-found-soft/70 rounded-tag px-3 py-2 transition-colors"
          >
            <span className="text-found">{otherName}'s report</span>
            <p className="text-ink font-medium mt-0.5">
              {otherReport.category} — {otherReport.description}
            </p>
          </a>
        )}
      </div>

      <div className="mt-6 space-y-3 min-h-[200px]">
        {messages && messages.length > 0 ? (
          messages.map((m) => {
            const mine = m.sender_id === user.id;
            const profile = mine ? myProfile : otherProfile;
            return (
              <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && <Avatar name={profile?.full_name} color={profile?.avatar_color} size={28} />}
                <div
                  className={`max-w-[70%] rounded-tag px-4 py-2.5 ${
                    mine ? "bg-ink text-paper" : "bg-white border border-line text-ink"
                  }`}
                >
                  <p className="text-sm">{m.body}</p>
                  <p className={`text-[11px] mt-1 ${mine ? "text-paper/60" : "text-ink-soft"}`}>
                    {new Date(m.created_at).toLocaleString("en-AU")}
                  </p>
                </div>
                {mine && <Avatar name={profile?.full_name} color={profile?.avatar_color} size={28} />}
              </div>
            );
          })
        ) : (
          <p className="text-ink-soft text-sm">
            No messages yet — say hello and arrange the handoff.
          </p>
        )}
      </div>

      <SendMessageBox matchId={matchId} hasMessages={!!messages && messages.length > 0} />
    </div>
  );
}
