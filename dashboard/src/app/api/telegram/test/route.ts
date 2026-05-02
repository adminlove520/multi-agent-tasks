import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { botToken, chatId, message } = await req.json();

  if (!botToken || !chatId) {
    return NextResponse.json({ error: "Missing botToken or chatId" }, { status: 400 });
  }

  const text = message || "🚀 This is a test message from your Multi-Agent Task Dashboard!";
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      return NextResponse.json({ error: data.description }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
