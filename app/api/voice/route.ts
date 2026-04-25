import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { message, systemPrompt, language } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    const langInstruction =
      language === "bn"
        ? `IMPORTANT: You MUST respond ONLY in Bengali (বাংলা) language. Use natural, conversational Bengali. Do not use English at all except for medical terms that have no Bengali equivalent — and even then, briefly explain them in Bengali.`
        : `Respond in clear, conversational English. Keep responses concise and spoken-word friendly — avoid bullet points or markdown formatting since your response will be read aloud.`;

    const system = `You are a compassionate, knowledgeable health research assistant — like a brilliant doctor-friend who gives real, detailed, helpful answers in plain language. You are assisting a caregiver/patient who is asking health questions by voice.

${langInstruction}

${systemPrompt || ""}

VOICE RESPONSE RULES:
- Keep responses conversational and natural — they will be spoken aloud by text-to-speech
- Avoid bullet points, numbered lists, markdown, or special characters
- Use natural spoken transitions like "First...", "Also...", "Most importantly..."
- Be warm, empathetic, and thorough but not overly long — aim for 3–5 sentences to 2–3 short paragraphs
- Always end with an actionable suggestion or offer to explain more
- For serious symptoms, always recommend consulting a doctor`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error?.message || "API error" }, { status: response.status });
    }

    const text = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n");

    return NextResponse.json({ text });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
