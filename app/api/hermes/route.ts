import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKey, model } = await req.json();
    const key = apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) return NextResponse.json({ error: "OpenRouter API key required" }, { status: 400 });
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "HTTP-Referer": "https://health-research-agent.vercel.app" },
      body: JSON.stringify({ model: model || "nousresearch/hermes-3-llama-3.1-70b", max_tokens: 4000, messages }),
    });
    const data = await response.json();
    if (data.error) return NextResponse.json({ error: data.error.message || JSON.stringify(data.error) }, { status: 400 });
    const text = data.choices?.[0]?.message?.content || "";
    return NextResponse.json({ text });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
