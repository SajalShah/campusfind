import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ItemTag from "@/components/ItemTag";
import ClaimButton from "@/components/ClaimButton";

export default async function MyReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS also enforces this at the database layer — this filter is for
  // display ordering, not the security boundary itself.
  const { data: items, error } = await supabase
    .from("item_reports")
    .select(
      "id, type:report_type, category, description, location:campus_location, date_occurred:item_date, colour, status, item_images(storage_path)"
    )
    .eq("reporter_id", user.id)
    .order("item_date", { ascending: false });

  const itemsWithImage = items?.map((item) => ({
    ...item,
    image_path: item.item_images?.[0]?.storage_path ?? null,
  }));

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">My reports</h1>
      <p className="text-ink-soft text-sm mt-2">
        Every report here, and every match found against it, is also sent to
        your email as a timestamped record.
      </p>

      {error && (
        <p className="text-sm text-lost mt-4">
          Couldn't load your reports: {error.message}
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 mt-8">
        {itemsWithImage && itemsWithImage.length > 0 ? (
          itemsWithImage.map((item) => (
            <div key={item.id}>
              <ItemTag item={item} />
              {item.status === "submitted" && (
                <div className="ml-4 mt-2">
                  <ClaimButton reportId={item.id} />
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-ink-soft text-sm col-span-2">
            You haven't reported anything yet.
          </p>
        )}
      </div>
    </div>
  );
}
