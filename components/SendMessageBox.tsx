"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SendMessageBox({ matchId }: { matchId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired — please sign in again.");
      setSending(false);
      return;
    }

    const { error: insertError } = await supabase.from("messages").insert({
      match_id: matchId,
      sender_id: user.id,
      body: body.trim(),
    });

    setSending(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSend} className="flex gap-2 mt-4">
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Type a message…"
        maxLength={2000}
        className="flex-1 border border-line rounded-tag px-3 py-2 focus-ring"
      />
      <button
        type="submit"
        disabled={sending || !body.trim()}
        className="bg-ink text-paper px-4 py-2 rounded-tag font-medium hover:bg-ink/90 disabled:opacity-50 focus-ring"
      >
        {sending ? "Sending…" : "Send"}
      </button>
      {error && <p className="text-sm text-lost">{error}</p>}
    </form>
  );
}
