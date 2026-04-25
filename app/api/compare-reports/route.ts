import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { Document } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { profileId, sessionId, userId, patientProfile, language } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

    // Fetch all reports for this patient sorted by date
    let docsQuery = getSupabaseAdmin()
      .from("documents")
      .select("*")
      .eq("profile_id", profileId)
      .eq("category", "report")
      .not("ai_values", "is", null)
      .order("report_date", { ascending: true });

    if (userId) {
      docsQuery = docsQuery.eq("user_id", userId);
    } else {
      docsQuery = docsQuery.eq("session_id", sessionId);
    }

    const { data: docs, error } = await docsQuery;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!docs || docs.length < 1) return NextResponse.json({ error: "No analyzed reports found. Please analyze reports first." }, { status: 400 });

    const langInstruction = language === "bn"
      ? `CRITICAL: তুমি অবশ্যই সম্পূর্ণ বাংলায় উত্তর দেবে। প্রতিটি অংশ বাংলায় লিখবে।`
      : `Respond in English.`;

    const reportsData = (docs as Document[]).map((d, i) => ({
      index: i + 1,
      date: d.report_date || d.created_at,
      name: d.file_name,
      values: d.ai_values,
      summary: d.ai_summary,
    }));

    const prompt = `You are a senior physician and data scientist analyzing a patient's medical reports over time to identify trends, improvements, deteriorations, and provide actionable recommendations.

${langInstruction}

PATIENT: ${patientProfile?.name || "Patient"}, ${patientProfile?.age}y ${patientProfile?.gender}
CONDITIONS: ${patientProfile?.conditions || "Not specified"}
CURRENT ISSUE: ${patientProfile?.currentIssue || "Not specified"}
MEDICATIONS: ${patientProfile?.meds || "Not specified"}

REPORTS OVER TIME (chronological):
${JSON.stringify(reportsData, null, 2)}

Provide a comprehensive trend analysis with these EXACT sections. ${language === "bn" ? "সমস্ত বিভাগ বাংলায় লিখুন:" : "Write all sections in English:"}

📊 সামগ্রিক ট্রেন্ড / OVERALL TREND
[Summarize overall health trajectory - improving, stable, or worsening]

✅ যা উন্নতি হচ্ছে / WHAT'S IMPROVING  
[List specific values/conditions showing improvement with data points and dates]

⚠️ যা খারাপ হচ্ছে / WHAT'S WORSENING
[List specific values/conditions that are deteriorating with data and concern level]

🔍 কেন এটি হতে পারে / POSSIBLE CAUSES
[Evidence-based explanation of WHY changes are occurring - medications, lifestyle, disease progression]

💊 এখন কী করবেন / ACTION PLAN
[Specific, prioritized actionable recommendations based on the trends]

🏥 ডাক্তারের সাথে আলোচনা করুন / DISCUSS WITH DOCTOR
[Specific questions/concerns to raise at next appointment]

🌿 জীবনযাপন ও খাদ্য পরিবর্তন / LIFESTYLE & DIET CHANGES
[Evidence-based lifestyle modifications that can help based on these specific trends]

⚡ জরুরি লক্ষণ / WARNING SIGNS
[Specific symptoms that should trigger immediate medical attention given these trends]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
    });

    const respData = await response.json();
    if (!response.ok) return NextResponse.json({ error: respData.error?.message }, { status: response.status });

    const analysisText = (respData.content || []).filter((b: {type:string}) => b.type === "text").map((b: {text:string}) => b.text).join("");

    // Cache the analysis
    await getSupabaseAdmin().from("report_analyses").upsert({
      session_id: sessionId,
      profile_id: profileId,
      analysis_text: analysisText,
      document_ids: (docs as Document[]).map((d) => d.id),
    }, { onConflict: "profile_id,session_id" }).select();

    return NextResponse.json({
      analysis: analysisText,
      reportCount: docs.length,
      dateRange: { from: reportsData[0]?.date, to: reportsData[reportsData.length - 1]?.date },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
