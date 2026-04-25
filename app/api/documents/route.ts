import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = searchParams.get("profileId");
    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");

    if (!profileId) return NextResponse.json({ error: "Missing profileId" }, { status: 400 });

    let query = getSupabaseAdmin()
      .from("documents")
      .select("*")
      .eq("profile_id", parseInt(profileId))
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (sessionId) {
      query = query.eq("session_id", sessionId);
    } else {
      return NextResponse.json({ documents: [] });
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ documents: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const filePath = searchParams.get("filePath");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (filePath) {
      await getSupabaseAdmin().storage.from("health-documents").remove([filePath]);
    }
    const { error } = await getSupabaseAdmin().from("documents").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
