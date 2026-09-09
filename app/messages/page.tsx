import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages");

  // Every confirmed match (status = 'pursued') is a conversation. RLS on
  // match_suggestions restricts direct student access, so this reads only
  // the matches this user is actually a reporter on — via item_reports.
  const { data: myReports } = await supabase
    .from("item_reports")
    .select("id")
    .eq("reporter_id", user.id);
  const myReportIds = (myReports ?? []).map((r) => r.id);

  let matches: any[] = [];
  if (myReportIds.length) {
    const orFilter = myReportIds
      .map((id) => `lost_report_id.eq.${id},found_report_id.eq.${id}`)
      .join(",");
    const { data } = await supabase
      .from("match_suggestions")
      .select("id, total_score, lost_report_id, found_report_id, status")
      .eq("status", "pursued")
      .or(orFilter);
    matches = data ?? [];
  }

  // Pull report details + last message for each conversation.
  const conversations = await Promise.all(
    matches.map(async (m) => {
      const isLostSide = myReportIds.includes(m.lost_report_id);
      const myReportId = isLostSide ? m.lost_report_id : m.found_report_id;
      const otherReportId = isLostSide ? m.found_report_id : m.lost_report_id;

      const { data: otherReport } = await supabase
        .from("item_reports")
        .select("category, description")
        .eq("id", otherReportId)
        .single();

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("body, created_at, sender_id")
        .eq("match_id", m.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("match_id", m.id)
        .neq("sender_id", user.id)
        .is("read_at", null);

      return {
        matchId: m.id,
        myReportId,
        otherReport,
        lastMsg,
        unread: unread ?? 0,
      };
    })
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">Messages</h1>
      <p className="text-ink-soft text-sm mt-2">
        Private conversations with students you've been matched with.
      </p>

      <div className="mt-8 space-y-3">
        {conversations.length > 0 ? (
          conversations.map((c) => (
            <Link
              key={c.matchId}
              href={`/messages/${c.matchId}`}
              className="ticket ml-4 p-4 flex items-center justify-between gap-4 block hover:bg-line/10 transition-colors"
            >
              <div>
                <p className="font-medium text-ink">
                  {c.otherReport?.category ?? "Item"}
                </p>
                <p className="text-sm text-ink-soft mt-0.5 line-clamp-1">
                  {c.lastMsg?.body ?? "No messages yet — say hello!"}
                </p>
              </div>
              {c.unread > 0 && (
                <span className="bg-lost text-paper text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                  {c.unread}
                </span>
              )}
            </Link>
          ))
        ) : (
          <p className="text-ink-soft text-sm">
            No conversations yet — once you're matched with someone, you can
            message them directly here.
          </p>
        )}
      </div>
    </div>
  );
}
