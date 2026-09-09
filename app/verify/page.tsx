"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VerifyPage() {
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const nextUrl = params.get("next") || "/browse";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(nextUrl);
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-20">
      <h1 className="font-serif text-3xl text-ink">Enter your code</h1>
      <p className="text-ink-soft text-sm mt-2">
        Sent to <span className="text-ink font-medium">{email}</span>. It
        expires in a few minutes.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="12345678"
          className="w-full border border-line rounded-tag px-3 py-3 text-center text-2xl tracking-[0.3em] focus-ring"
        />

        {error && <p className="text-sm text-lost">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-paper py-2.5 rounded-tag font-medium hover:bg-ink/90 disabled:opacity-50 focus-ring"
        >
          {loading ? "Verifying…" : "Verify and sign in"}
        </button>
      </form>
    </div>
  );
}
