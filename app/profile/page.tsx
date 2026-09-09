"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar, { AVATAR_COLORS } from "@/components/Avatar";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [role, setRole] = useState<string>("student");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isAdmin = role === "administrator";
  const idLabel = isAdmin ? "Admin ID" : "Student ID";
  const idPlaceholder = isAdmin ? "a1234567" : "s1234567";

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("users")
        .select("full_name, student_id, role, avatar_color")
        .eq("id", user.id)
        .single();

      setFullName(profile?.full_name ?? "");
      setStudentId(profile?.student_id ?? "");
      setRole(profile?.role ?? "student");
      setAvatarColor(profile?.avatar_color ?? null);
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Session expired — please sign in again.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ full_name: fullName, student_id: studentId, avatar_color: avatarColor })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="text-ink-soft text-sm">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">Your profile</h1>
      <p className="text-ink-soft text-sm mt-2">
        This is what shows on reports and match emails.
      </p>
      {isAdmin && (
        <span className="inline-block mt-3 text-xs font-medium px-2 py-0.5 rounded-tag bg-brass/20 text-brass-dark">
          Administrator
        </span>
      )}

      <div className="flex items-center gap-4 mt-6">
        <Avatar name={fullName || email} color={avatarColor} size={56} />
        <div>
          <p className="text-sm font-medium text-ink">{fullName || "Your name"}</p>
          <p className="text-xs text-ink-soft">This is how you'll appear to matched students</p>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-sm font-medium text-ink">Avatar colour</label>
        <div className="flex gap-2 mt-2">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setAvatarColor(c.value)}
              className={`w-8 h-8 rounded-full focus-ring ${
                avatarColor === c.value ? "ring-2 ring-offset-2 ring-ink" : ""
              }`}
              style={{ backgroundColor: c.value }}
              aria-label={c.name}
              title={c.name}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-8 space-y-5">
        <div>
          <label className="text-sm font-medium text-ink">Email</label>
          <input
            value={email}
            disabled
            className="mt-1 w-full border border-line rounded-tag px-3 py-2 bg-line/20 text-ink-soft"
          />
          <p className="text-xs text-ink-soft mt-1">
            Your email is tied to sign-in and can't be changed here.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jordan Smith"
            className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink">
            {idLabel} <span className="text-ink-soft font-normal">(optional)</span>
          </label>
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder={idPlaceholder}
            className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
          />
        </div>

        {error && <p className="text-sm text-lost">{error}</p>}
        {saved && <p className="text-sm text-found">Profile saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-ink text-paper py-2.5 rounded-tag font-medium hover:bg-ink/90 disabled:opacity-50 focus-ring"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
