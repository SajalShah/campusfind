import { createClient } from "@/lib/supabase/server";
import ItemTag from "@/components/ItemTag";
import CategoryFilter from "@/components/CategoryFilter";

type Tab = "lost" | "found" | "claimed";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab =
    params.type === "found" ? "found" : params.type === "claimed" ? "claimed" : "lost";
  const category = params.category ?? "";
  const supabase = await createClient();

  // Public browse: students see the description-level details of all open
  // reports, not who reported them — the users table stays admin/owner-only
  // per RLS.
  let query = supabase
    .from("item_reports")
    .select(
      "id, type:report_type, category, description, location:campus_location, date_occurred:item_date, colour, status, item_images(storage_path)"
    )
    .order("item_date", { ascending: false });

  query =
    tab === "claimed"
      ? query.eq("status", "claimed")
      : query.eq("report_type", tab).in("status", ["submitted", "under_review", "pending_verification"]);

  if (category) query = query.eq("category", category);

  const { data: items, error } = await query;

  const itemsWithImage = items?.map((item) => ({
    ...item,
    image_path: item.item_images?.[0]?.storage_path ?? null,
  }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">Browse items</h1>
      <p className="text-ink-soft text-sm mt-2">
        See something that's yours? Sign in and it'll be matched
        automatically against your report.
      </p>

      <div className="flex items-center justify-between flex-wrap gap-4 mt-6 border-b border-line pb-0">
        <div className="flex gap-3">
          <a
            href={`/browse?type=lost${category ? `&category=${category}` : ""}`}
            className={`pb-3 px-1 border-b-2 font-medium ${
              tab === "lost" ? "border-lost text-lost" : "border-transparent text-ink-soft"
            }`}
          >
            Lost
          </a>
          <a
            href={`/browse?type=found${category ? `&category=${category}` : ""}`}
            className={`pb-3 px-1 border-b-2 font-medium ${
              tab === "found" ? "border-found text-found" : "border-transparent text-ink-soft"
            }`}
          >
            Found
          </a>
          <a
            href={`/browse?type=claimed${category ? `&category=${category}` : ""}`}
            className={`pb-3 px-1 border-b-2 font-medium ${
              tab === "claimed" ? "border-brass text-brass-dark" : "border-transparent text-ink-soft"
            }`}
          >
            Claimed
          </a>
        </div>
        <div className="pb-3">
          <CategoryFilter tab={tab} currentCategory={category} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-lost mt-4">
          Couldn't load items: {error.message}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 mt-8">
        {itemsWithImage && itemsWithImage.length > 0 ? (
          itemsWithImage.map((item) => <ItemTag key={item.id} item={item} />)
        ) : (
          <p className="text-ink-soft text-sm col-span-2">
            No {tab} items{category ? ` in that category` : ""} reported yet.
          </p>
        )}
      </div>
    </div>
  );
}
