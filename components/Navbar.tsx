import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let unreadCount = 0;
  let unreadMessages = 0;

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "administrator";

    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    unreadCount = count ?? 0;

    const { count: msgCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .is("read_at", null);
    unreadMessages = msgCount ?? 0;
  }

  return (
    <header className="bg-ink">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path
              d="M9 3H21C22.1 3 23 3.9 23 5V19.5L16 25L9 19.5V5C9 3.9 9.9 3 11 3H9Z"
              fill="#F5F4EF"
            />
            <circle cx="16" cy="8.5" r="2.5" fill="#1C2531" />
          </svg>
          <span className="font-serif text-xl font-600 text-paper">
            CampusFind
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm">
          <Link href="/report" className="text-paper/70 hover:text-paper">
            Report an item
          </Link>
          {user && (
            <Link href="/my-reports" className="text-paper/70 hover:text-paper">
              My reports
            </Link>
          )}
          <Link href="/browse" className="text-paper/70 hover:text-paper">
            Browse
          </Link>
          <Link href="/about" className="text-paper/70 hover:text-paper">
            About
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-paper/70 hover:text-paper">
              Admin
            </Link>
          )}
          <Link href="/help" className="text-paper/70 hover:text-paper">
            Help
          </Link>
        </nav>

        <div className="flex items-center gap-4 text-sm shrink-0">
          {user ? (
            <>
              <Link href="/messages" className="relative text-paper/70 hover:text-paper" aria-label="Messages">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-found text-paper text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>
              <Link href="/notifications" className="relative text-paper/70 hover:text-paper" aria-label="Notifications">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-lost text-paper text-[10px] font-medium rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="text-paper/70 hover:text-paper">
                Profile
              </Link>
              <form action="/auth/sign-out" method="post">
                <button className="text-paper/70 hover:text-paper focus-ring">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="bg-brass text-ink px-4 py-2 rounded-tag font-medium hover:bg-brass/90 focus-ring"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
