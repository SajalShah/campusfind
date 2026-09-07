import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ItemTag from "@/components/ItemTag";

export default async function MyReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS also enforces this at the database layer — this filter is for
  // display ordering, not the security boundary itself.
  const { data: items } = await supabase
    .from("item_reports")
    .select("id, type, category, description, location, date_occurred, colour, status")
    .eq("user_id", user.id)
    .order("date_occurred", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="font-serif text-3xl text-ink">My reports</h1>
      <p className="text-ink-soft text-sm mt-2">
        Every report here, and every match found against it, is also sent to
        your email as a timestamped record.
      </p>

      <div className="grid md:grid-cols-2 gap-x-8 gap-y-6 mt-8">
        {items && items.length > 0 ? (
          items.map((item) => <ItemTag key={item.id} item={item} />)
        ) : (
          <p className="text-ink-soft text-sm col-span-2">
            You haven't reported anything yet.
          </p>
        )}
      </div>
    </div>
  );
}
