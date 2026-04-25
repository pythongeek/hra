import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKey, model } = await req.json();
    const key = apiKey || process.env.MINIMAX_API_KEY;
    if (!key) return NextResponse.json({ error: "MiniMax API key required" }, { status: 400 });
    const response = await fetch("https://api.minimax.chat/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({ model: model || "MiniMax-Text-01", max_tokens: 4000, messages }),
    });
    const data = await response.json();
    if (data.base_resp && data.base_resp.status_code !== 0) return NextResponse.json({ error: data.base_resp.status_msg }, { status: 400 });
    const text = data.choices?.[0]?.message?.content || "";
    return NextResponse.json({ text });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}
