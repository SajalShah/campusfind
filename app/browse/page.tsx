import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ItemTag from "@/components/ItemTag";
import CategoryFilter from "@/components/CategoryFilter";
import SearchBox from "@/components/SearchBox";

type Tab = "lost" | "found" | "claimed";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/browse");

  const params = await searchParams;
  const tab: Tab =
    params.type === "found" ? "found" : params.type === "claimed" ? "claimed" : "lost";
  const category = params.category ?? "";
  const q = params.q ?? "";

  let query = supabase
    .from("item_reports")
    .select(
      "id, type:report_type, category, description, location:campus_location, date_occurred:item_date, colour, status, reporter_id, item_images(storage_path)"
    )
    .order("item_date", { ascending: false });

  query =
    tab === "claimed"
      ? query.eq("status", "claimed")
      : query.eq("report_type", tab).in("status", ["submitted", "under_review", "pending_verification"]);

  if (category) query = query.eq("category", category);
  if (q) query = query.or(`description.ilike.%${q}%,campus_location.ilike.%${q}%`);

  const { data: items, error } = await query;

  // Reporter names — a narrow public_profiles view (id, full_name only)
  // so we never expose email/student_id/role on a public listing.
  const reporterIds = [...new Set((items ?? []).map((i) => i.reporter_id).filter(Boolean))];
  const { data: profiles } = reporterIds.length
    ? await supabase.from("public_profiles").select("id, full_name").in("id", reporterIds)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  // For claimed items, find who the matched counterpart was (claimed
  // "from" whom) via any confirmed (pursued) match involving this report.
  let counterpartByReport = new Map<string, string>();
  if (tab === "claimed" && items && items.length > 0) {
    const ids = items.map((i) => i.id);
    const orFilter = ids.map((id) => `lost_report_id.eq.${id},found_report_id.eq.${id}`).join(",");
    const { data: matches } = await supabase
      .from("match_suggestions")
      .select("lost_report_id, found_report_id")
      .eq("status", "pursued")
      .or(orFilter);

    const counterpartReportId = new Map<string, string>();
    for (const m of matches ?? []) {
      if (ids.includes(m.lost_report_id)) counterpartReportId.set(m.lost_report_id, m.found_report_id);
      if (ids.includes(m.found_report_id)) counterpartReportId.set(m.found_report_id, m.lost_report_id);
    }
    const counterpartIds = [...counterpartReportId.values()];
    const { data: counterpartReports } = counterpartIds.length
      ? await supabase.from("item_reports").select("id, reporter_id").in("id", counterpartIds)
      : { data: [] };
    const reporterByCounterpartReport = new Map((counterpartReports ?? []).map((r) => [r.id, r.reporter_id]));

    const { data: counterpartProfiles } = counterpartIds.length
      ? await supabase.from("public_profiles").select("id, full_name").in(
          "id",
          [...new Set((counterpartReports ?? []).map((r) => r.reporter_id))]
        )
      : { data: [] };
    const counterpartNameById = new Map((counterpartProfiles ?? []).map((p) => [p.id, p.full_name]));

    for (const [reportId, counterpartReportId2] of counterpartReportId) {
      const reporterId = reporterByCounterpartReport.get(counterpartReportId2);
      const name = reporterId ? counterpartNameById.get(reporterId) : null;
      if (name) counterpartByReport.set(reportId, name);
    }
  }

  const itemsWithExtras = items?.map((item) => ({
    ...item,
    image_path: item.item_images?.[0]?.storage_path ?? null,
    reporterName: item.reporter_id ? nameById.get(item.reporter_id) ?? null : null,
    claimedFrom: counterpartByReport.get(item.id) ?? null,
  }));

  const tabHref = (t: string) => {
    const p = new URLSearchParams({ type: t });
    if (category) p.set("category", category);
    if (q) p.set("q", q);
    return `/browse?${p.toString()}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">Browse items</h1>
      <p className="text-ink-soft text-sm mt-2">
        See something that's yours? It'll be matched automatically against your report.
      </p>

      <div className="mt-6">
        <SearchBox tab={tab} category={category} initialQuery={q} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4 mt-4 border-b border-line pb-0">
        <div className="flex gap-3">
          <a href={tabHref("lost")} className={`pb-3 px-1 border-b-2 font-medium ${tab === "lost" ? "border-lost text-lost" : "border-transparent text-ink-soft"}`}>
            Lost
          </a>
          <a href={tabHref("found")} className={`pb-3 px-1 border-b-2 font-medium ${tab === "found" ? "border-found text-found" : "border-transparent text-ink-soft"}`}>
            Found
          </a>
          <a href={tabHref("claimed")} className={`pb-3 px-1 border-b-2 font-medium ${tab === "claimed" ? "border-brass text-brass-dark" : "border-transparent text-ink-soft"}`}>
            Claimed
          </a>
        </div>
        <div className="pb-3">
          <CategoryFilter tab={tab} currentCategory={category} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-lost mt-4">Couldn't load items: {error.message}</p>
      )}

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 mt-8">
        {itemsWithExtras && itemsWithExtras.length > 0 ? (
          itemsWithExtras.map((item) => <ItemTag key={item.id} item={item} />)
        ) : (
          <p className="text-ink-soft text-sm col-span-2">
            No {tab} items{category ? " in that category" : ""}{q ? ` matching "${q}"` : ""} found.
          </p>
        )}
      </div>
    </div>
  );
}
