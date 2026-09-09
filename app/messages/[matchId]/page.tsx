import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SendMessageBox from "@/components/SendMessageBox";

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
    .select("id, lost_report_id, found_report_id")
    .eq("id", matchId)
    .single();

  if (matchError || !match) notFound();

  const { data: lostReport } = await supabase
    .from("item_reports")
    .select("category, description, reporter_id")
    .eq("id", match.lost_report_id)
    .single();
  const { data: foundReport } = await supabase
    .from("item_reports")
    .select("category, description, reporter_id")
    .eq("id", match.found_report_id)
    .single();

  const isLostSide = lostReport?.reporter_id === user.id;
  const otherReport = isLostSide ? foundReport : lostReport;

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
      <h1 className="font-serif text-2xl text-ink mt-2">
        {otherReport?.category ?? "Conversation"}
      </h1>
      <p className="text-ink-soft text-sm mt-1">{otherReport?.description}</p>

      <div className="mt-8 space-y-3 min-h-[200px]">
        {messages && messages.length > 0 ? (
          messages.map((m) => {
            const mine = m.sender_id === user.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-tag px-4 py-2.5 ${
                    mine ? "bg-ink text-paper" : "bg-white border border-line text-ink"
                  }`}
                >
                  <p className="text-sm">{m.body}</p>
                  <p className={`text-[11px] mt-1 ${mine ? "text-paper/60" : "text-ink-soft"}`}>
                    {new Date(m.created_at).toLocaleString("en-AU")}
                  </p>
                </div>
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
