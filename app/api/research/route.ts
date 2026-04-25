import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, system } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, system, messages }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error?.message || "API error" }, { status: response.status });
    const text = (data.content || []).filter((b: {type:string}) => b.type === "text").map((b: {text:string}) => b.text).join("\n");
    return NextResponse.json({ text });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
