import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { documentId, fileUrl, fileType, patientProfile, language } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

    const langInstruction = language === "bn"
      ? "তুমি অবশ্যই সম্পূর্ণ বাংলায় উত্তর দেবে। সারসংক্ষেপ এবং বিশ্লেষণ বাংলায় লিখবে।"
      : "Respond in English.";

    const systemPrompt = `You are an expert medical document analyst with PhD-level knowledge of pathology, radiology, and clinical medicine. 
    
${langInstruction}

TASK: Analyze the medical document/report and extract ALL medical values, measurements, and findings.

Return a JSON object with this EXACT structure (no markdown, just raw JSON):
{
  "document_type": "type of document e.g. Urine R/E, CBC, Prescription, X-Ray, etc.",
  "date_found": "date found in document if any, else null",
  "key_values": {
    "value_name": {"value": "123", "unit": "cells/hpf", "normal_range": "0-5", "status": "high|low|normal", "flag": true|false}
  },
  "findings": ["finding 1", "finding 2"],
  "summary_${language === "bn" ? "bn" : "en"}": "2-3 sentence plain language summary of what this document shows",
  "concerns": ["concern 1", "concern 2"],
  "positive_notes": ["positive finding 1"]
}

Patient context: ${patientProfile ? `${patientProfile.name}, ${patientProfile.age}y ${patientProfile.gender}. Conditions: ${patientProfile.conditions}` : "Unknown"}`;

    // Fetch the file and convert to base64
    const fileRes = await fetch(fileUrl);
    const buffer = await fileRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = fileType === "pdf" ? "application/pdf" : "image/jpeg";

    // Build message content based on file type
    const messageContent = fileType === "pdf"
      ? [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Please analyze this medical document and extract all values and findings as requested." }
        ]
      : [
          { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
          { type: "text", text: "Please analyze this medical report image and extract all values and findings as requested." }
        ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, system: systemPrompt, messages: [{ role: "user", content: messageContent }] }),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message }, { status: response.status });

    const rawText = (data.content || []).filter((b: {type:string}) => b.type === "text").map((b: {text:string}) => b.text).join("");

    // Parse JSON from response
    let parsed: Record<string, unknown> = {};
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch { parsed = { summary_en: rawText, summary_bn: rawText }; }

    const summaryKey = language === "bn" ? "summary_bn" : "summary_en";
    const summary = (parsed[summaryKey] as string) || (parsed["summary_en"] as string) || rawText;
    const aiValues = parsed.key_values as Record<string, string> || {};

    // Update document in DB with AI analysis
    if (documentId) {
      await getSupabaseAdmin().from("documents").update({
        ai_summary: summary,
        ai_values: aiValues,
        updated_at: new Date().toISOString(),
      }).eq("id", documentId);
    }

    return NextResponse.json({ summary, aiValues, fullAnalysis: parsed });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
