import { createClient } from "@/lib/supabase/server";
import ItemTag from "@/components/ItemTag";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const type = searchParams.type === "found" ? "found" : "lost";
  const supabase = await createClient();

  // Public browse: students see the description-level details of all open
  // reports, not who reported them — the users table stays admin/owner-only
  // per RLS.
  const { data: items } = await supabase
    .from("item_reports")
    .select("id, type, category, description, location, date_occurred, colour")
    .eq("type", type)
    .order("date_occurred", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">Browse items</h1>
      <p className="text-ink-soft text-sm mt-2">
        See something that's yours? Sign in and it'll be matched
        automatically against your report.
      </p>

      <div className="flex gap-3 mt-6 border-b border-line">
        <a
          href="/browse?type=lost"
          className={`pb-3 px-1 border-b-2 font-medium ${
            type === "lost"
              ? "border-lost text-lost"
              : "border-transparent text-ink-soft"
          }`}
        >
          Lost
        </a>
        <a
          href="/browse?type=found"
          className={`pb-3 px-1 border-b-2 font-medium ${
            type === "found"
              ? "border-found text-found"
              : "border-transparent text-ink-soft"
          }`}
        >
          Found
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 mt-8">
        {items && items.length > 0 ? (
          items.map((item) => <ItemTag key={item.id} item={item} />)
        ) : (
          <p className="text-ink-soft text-sm col-span-2">
            No {type} items reported yet.
          </p>
        )}
      </div>
    </div>
  );
}
