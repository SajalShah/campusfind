"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SUGGESTIONS = [
  "Hi! I think this might be my item — can you describe any identifying details?",
  "Can you confirm the exact spot and time you found/lost it?",
  "Could you share a photo, if you haven't already?",
  "When and where would work for you to hand it over?",
  "Thanks for confirming — see you then!",
];

export default function SendMessageBox({
  matchId,
  hasMessages,
}: {
  matchId: string;
  hasMessages: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(text: string) {
    if (!text.trim()) return;
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
      body: text.trim(),
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
    <div className="mt-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setBody(s)}
            className="text-xs text-ink-soft border border-line rounded-tag px-2.5 py-1 hover:bg-line/20 hover:text-ink focus-ring"
          >
            {s.length > 40 ? s.slice(0, 40) + "…" : s}
          </button>
        ))}
      </div>
      {!hasMessages && (
        <p className="text-xs text-ink-soft mb-2">
          Tip: ask for an identifying detail before agreeing to meet — a genuine owner can usually describe something the listing doesn't show.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(body);
        }}
        className="flex gap-2"
      >
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
      </form>
      {error && <p className="text-sm text-lost mt-1">{error}</p>}
    </div>
  );
}
