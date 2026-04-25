import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const sessionId = formData.get("sessionId") as string;
    const userId = formData.get("userId") as string | null;
    const profileId = formData.get("profileId") as string;
    const profileName = formData.get("profileName") as string;
    const category = (formData.get("category") as string) || "other";
    const reportDate = (formData.get("reportDate") as string) || null;

    if (!file || !profileId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    const fileType = file.type.startsWith("image/") ? "image" : "pdf";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const folderKey = userId || sessionId || "anon";
    const filePath = `${folderKey}/${profileId}/${category}/${Date.now()}_${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await getSupabaseAdmin().storage
      .from("health-documents")
      .upload(filePath, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = getSupabaseAdmin().storage
      .from("health-documents")
      .getPublicUrl(filePath);

    const { data: doc, error: dbError } = await getSupabaseAdmin()
      .from("documents")
      .insert({
        user_id: userId || null,
        session_id: sessionId || null,
        profile_id: parseInt(profileId),
        profile_name: profileName,
        file_name: file.name,
        file_path: filePath,
        file_url: urlData.publicUrl,
        file_type: fileType,
        category,
        report_date: reportDate || null,
      })
      .select()
      .single();

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
    return NextResponse.json({ document: doc });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
