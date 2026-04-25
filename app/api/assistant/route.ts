import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, patientProfile, documents, language, conversationHistory } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });

    const langInstruction = language === "bn"
      ? `CRITICAL INSTRUCTION: তুমি অবশ্যই সম্পূর্ণ বাংলায় উত্তর দেবে। ইংরেজি ব্যবহার করবে না যদি না চিকিৎসা পরিভাষার কোনো বাংলা শব্দ না থাকে। স্বাভাবিক, কথোপকথনমূলক বাংলায় কথা বলো।`
      : `Respond in clear, helpful English.`;

    // Build document context
    let documentContext = "";
    if (documents && documents.length > 0) {
      const docSummaries = documents
        .filter((d: {ai_summary?: string}) => d.ai_summary)
        .slice(-10) // last 10 analyzed docs
        .map((d: {file_name: string; category: string; report_date?: string; ai_summary: string; ai_values?: Record<string, unknown>}) => `
Document: ${d.file_name} (${d.category})
Date: ${d.report_date || "Unknown"}
Summary: ${d.ai_summary}
Key Values: ${d.ai_values ? JSON.stringify(d.ai_values) : "Not extracted"}
`).join("\n---\n");
      if (docSummaries) documentContext = `\nUPLOADED MEDICAL DOCUMENTS:\n${docSummaries}`;
    }

    const systemPrompt = `You are an elite AI health assistant with PhD-level expertise in medicine, pharmacology, and caregiving. You are a trusted advisor helping a caregiver manage their family member's health.

${langInstruction}

${patientProfile ? `
ACTIVE PATIENT:
Name: ${patientProfile.name} | Age: ${patientProfile.age}y | Gender: ${patientProfile.gender}
Conditions: ${patientProfile.conditions}
Current Issue: ${patientProfile.currentIssue}
Medications: ${patientProfile.meds || "Not specified"}
Recent Labs: ${patientProfile.labs || "Not specified"}
Notes: ${patientProfile.notes || ""}
` : ""}
${documentContext}

YOUR CAPABILITIES AND ROLE:
1. Answer health questions conversationally and warmly
2. Reference uploaded documents/reports when relevant
3. Identify trends and explain what values mean
4. Suggest follow-up questions the caregiver should explore
5. Provide practical caregiving advice
6. Flag urgent concerns that need immediate medical attention
7. Explain medical terminology in simple terms
8. Suggest what to discuss with doctors at appointments

RESPONSE STYLE:
- Be warm, compassionate, and conversational
- Keep responses focused and practical — 2-4 short paragraphs
- Always offer to explore more: "Want me to research this further?" or "বিস্তারিত জানতে চান?"
- For serious symptoms, strongly recommend immediate medical care
- After each response, suggest 2-3 relevant follow-up questions the user might want to ask
- Format as: main answer, then "💡 আরো জানতে পারেন: / You might also want to know:" followed by 2-3 suggestions`;

    const apiMessages = [
      ...(conversationHistory || []),
      ...messages,
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, system: systemPrompt, messages: apiMessages }),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message }, { status: response.status });

    const text = (data.content || []).filter((b: {type:string}) => b.type === "text").map((b: {text:string}) => b.text).join("");
    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
