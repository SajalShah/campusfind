import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, notification_type, message, related_report_id, is_read, created_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false });

  const hasUnread = notifications?.some((n) => !n.is_read);

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl text-ink">Notifications</h1>
        {hasUnread && (
          <form action="/notifications/mark-read" method="post">
            <button className="text-sm text-ink-soft hover:text-ink underline focus-ring">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {notifications && notifications.length > 0 ? (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`ticket ml-4 p-4 ${!n.is_read ? "border-brass" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-ink-soft uppercase tracking-wide">
                    {n.notification_type.replace(/_/g, " ")}
                  </p>
                  <p className="text-ink mt-1">{n.message}</p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-brass mt-1.5 shrink-0" />
                )}
              </div>
              <p className="text-xs text-ink-soft mt-2">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))
        ) : (
          <p className="text-ink-soft text-sm">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
