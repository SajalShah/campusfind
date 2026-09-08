import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { embedText, toVectorLiteral } from "@/lib/embeddings";

// Default serverless timeout (10s) isn't enough for a cold-start model load.
export const maxDuration = 60;

export async function POST(request: Request) {
  const { reportId } = await request.json();
  if (!reportId) {
    return NextResponse.json({ error: "reportId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: report, error: fetchError } = await admin
    .from("item_reports")
    .select("description")
    .eq("id", reportId)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const embedding = await embedText(report.description);

  const { error: updateError } = await admin
    .from("item_reports")
    .update({ description_embedding: toVectorLiteral(embedding) })
    .eq("id", reportId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ embedded: true, dimensions: embedding.length });
}
