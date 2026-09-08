"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Must exactly match the item_category enum in the database.
const CATEGORIES: { value: string; label: string }[] = [
  { value: "wallet", label: "Wallet" },
  { value: "bag", label: "Bag" },
  { value: "phone", label: "Phone" },
  { value: "laptop_tablet", label: "Laptop / Tablet" },
  { value: "keys", label: "Keys" },
  { value: "student_id_card", label: "Student ID card" },
  { value: "headphones", label: "Headphones" },
  { value: "charger", label: "Charger" },
  { value: "usb_drive", label: "USB drive" },
  { value: "book", label: "Book" },
  { value: "other", label: "Other" },
];

// Using toISOString() here would convert to UTC first, which can shift
// the date backward a full day for timezones ahead of UTC (like Sydney)
// depending on the time of day — silently blocking "today" from being
// selected. Build the date string from local components instead.
function getLocalDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
const today = getLocalDateString();

export default function ReportPage() {
  const router = useRouter();
  const supabase = createClient();

  const [type, setType] = useState<"lost" | "found">("lost");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateOccurred, setDateOccurred] = useState("");
  const [colour, setColour] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (description.trim().length < 10) {
      setError("Description needs to be at least 10 characters.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please sign in first.");
      setLoading(false);
      return;
    }

    // 1. Insert the report row. colour is required by the database —
    // fall back to "Not specified" rather than blocking submission on it.
    const { data: report, error: insertError } = await supabase
      .from("item_reports")
      .insert({
        reporter_id: user.id,
        report_type: type,
        category,
        description,
        campus_location: location,
        item_date: dateOccurred,
        colour: colour.trim() || "Not specified",
      })
      .select()
      .single();

    if (insertError || !report) {
      setError(insertError?.message ?? "Could not save report.");
      setLoading(false);
      return;
    }

    // 2. Image is optional — only upload and link it if one was chosen.
    // alt_text is required by the database, so derive it from the
    // description when a photo is attached.
    if (image) {
      const path = `${user.id}/${report.id}-${image.name}`;
      const { error: uploadError } = await supabase.storage
        .from("item-images")
        .upload(path, image);

      if (!uploadError) {
        await supabase.from("item_images").insert({
          report_id: report.id,
          storage_path: path,
          alt_text: description.slice(0, 100),
        });
      }
      // Deliberately non-fatal: a failed image upload shouldn't lose the report.
    }

    // Fire-and-forget, chained: compute this report's MiniLM embedding
    // first, THEN run matching — so the new report's description gets
    // real cosine-similarity scoring against existing reports instead of
    // falling back to word-overlap because the embedding wasn't ready yet.
    // Neither call blocks the UI; the user has already moved on.
    fetch("/api/embed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id }),
    })
      .catch(() => {})
      .finally(() => {
        fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId: report.id }),
        }).catch(() => {});
      });

    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push("/my-reports"), 1200);
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">Report an item</h1>
      <p className="text-ink-soft text-sm mt-2">
        Takes about two minutes. A photo helps but isn't required.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setType("lost")}
            className={`flex-1 py-2.5 rounded-tag border font-medium focus-ring ${
              type === "lost"
                ? "bg-lost text-paper border-lost"
                : "border-line text-ink-soft"
            }`}
          >
            I lost something
          </button>
          <button
            type="button"
            onClick={() => setType("found")}
            className={`flex-1 py-2.5 rounded-tag border font-medium focus-ring ${
              type === "found"
                ? "bg-found text-paper border-found"
                : "border-line text-ink-soft"
            }`}
          >
            I found something
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Description</label>
          <textarea
            required
            minLength={10}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Grey Kathmandu water bottle with a dented cap…"
            className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
          />
          <p className="text-xs text-ink-soft mt-1">At least 10 characters.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-ink">Location</label>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Building 5, Level 2"
              className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Date</label>
            <input
              required
              type="date"
              max={today}
              value={dateOccurred}
              onChange={(e) => setDateOccurred(e.target.value)}
              className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-ink">Colour</label>
          <input
            value={colour}
            onChange={(e) => setColour(e.target.value)}
            placeholder="Grey"
            className="mt-1 w-full border border-line rounded-tag px-3 py-2 focus-ring"
          />
          <p className="text-xs text-ink-soft mt-1">
            Leave blank and we'll record it as "Not specified".
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-ink">
            Photo <span className="text-ink-soft font-normal">(optional)</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="mt-1 w-full text-sm text-ink-soft focus-ring"
          />
        </div>

        {error && <p className="text-sm text-lost">{error}</p>}
        {success && (
          <p className="text-sm text-found">
            Report saved and logged — redirecting…
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-paper py-2.5 rounded-tag font-medium hover:bg-ink/90 disabled:opacity-50 focus-ring"
        >
          {loading ? "Submitting…" : "Submit report"}
        </button>
      </form>
    </div>
  );
}
