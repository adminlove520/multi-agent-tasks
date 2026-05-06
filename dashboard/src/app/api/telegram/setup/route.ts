import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { botToken, action } = await req.json();

  if (!botToken) {
    return NextResponse.json({ error: "Missing botToken" }, { status: 400 });
  }

  if (action === "activate_webhook") {
    const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`;
    // If we're on localhost, we can't set a webhook
    if (baseUrl.includes("localhost")) {
      return NextResponse.json({ error: "Cannot set Telegram Webhook from localhost." }, { status: 400 });
    }

    const webhookUrl = `${baseUrl}/api/telegram/hook`;
    const url = `https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.ok) {
        return NextResponse.json({ error: data.description }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Webhook activated!" });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
