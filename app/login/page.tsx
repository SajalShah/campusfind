"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("password");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleForgotPassword() {
    setError(null);
    if (!email) {
      setError("Enter your email above first, then click 'Forgot password?'");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    // On success the browser redirects to Google, then back to /auth/callback.
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/browse");
    router.refresh();
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/verify?email=${encodeURIComponent(email)}`);
  }

  return (
    <div className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">
        {mode === "password" && isSignUp ? "Create account" : "Sign in"}
      </h1>
      <p className="text-ink-soft text-sm mt-2">
        {mode === "password"
          ? "Use your university email and a password."
          : "We'll email you a sign-in code — no password needed."}
      </p>

      <button
        type="button"
        onClick={handleGoogle}
        className="w-full mt-6 flex items-center justify-center gap-3 border border-line rounded-tag py-2.5 font-medium text-ink hover:bg-line/20 focus-ring"
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 009 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.97 10.72A5.4 5.4 0 013.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 000 9c0 1.45.35 2.83.95 4.05l3.02-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 00.95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px bg-line flex-1" />
        <span className="text-xs text-ink-soft">or continue with email</span>
        <div className="h-px bg-line flex-1" />
      </div>

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`flex-1 py-2 text-sm rounded-tag border font-medium ${
            mode === "password"
              ? "border-ink bg-ink text-paper"
              : "border-line text-ink-soft"
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode("otp")}
          className={`flex-1 py-2 text-sm rounded-tag border font-medium ${
            mode === "otp"
              ? "border-ink bg-ink text-paper"
              : "border-line text-ink-soft"
          }`}
        >
          Email code
        </button>
      </div>

      {mode === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink">
              University email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.vu.edu.au"
              className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
            />
          </div>

          {error && <p className="text-sm text-lost">{error}</p>}
          {resetSent && (
            <p className="text-sm text-found">
              If an account exists for that email, a reset link has been sent.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper py-2.5 rounded-tag font-medium hover:bg-ink/90 disabled:opacity-50 focus-ring"
          >
            {loading
              ? "Please wait…"
              : isSignUp
              ? "Create account"
              : "Sign in"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-ink-soft hover:text-ink"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
            {!isSignUp && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-ink-soft hover:text-ink underline"
              >
                Forgot password?
              </button>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handleOtpSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink">
              University email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@student.vu.edu.au"
              className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
            />
          </div>

          {error && <p className="text-sm text-lost">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper py-2.5 rounded-tag font-medium hover:bg-ink/90 disabled:opacity-50 focus-ring"
          >
            {loading ? "Sending code…" : "Send code"}
          </button>
        </form>
      )}
    </div>
  );
}
