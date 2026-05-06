import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { botToken: inputToken, action } = await req.json();

  let botToken = inputToken;

  // 1. 密钥恢复逻辑：如果前端传的是遮罩值，则从环境变量中取真实密钥
  if (!botToken || botToken === "********") {
    botToken = process.env.TELEGRAM_BOT_TOKEN;
  }

  if (!botToken || botToken === "********") {
    return NextResponse.json({ error: "Token missing. Please enter your Bot Token again." }, { status: 400 });
  }

  if (action === "activate_webhook") {
    // 2. 确定 Webhook URL (适配 Vercel 生产环境)
    let baseUrl = "";
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
      baseUrl = process.env.NEXTAUTH_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      const host = req.headers.get("host");
      baseUrl = host ? `https://${host}` : "";
    }

    baseUrl = baseUrl.replace(/\/$/, "");
    const webhookUrl = `${baseUrl}/api/telegram/hook`.trim();

    // 3. 调用 Telegram API (改用 POST JSON 格式，避开 URL 编码问题)
    const tgApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;

    try {
      const response = await fetch(tgApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          drop_pending_updates: true,
          allowed_updates: ["message", "edited_message", "callback_query", "channel_post", "edited_channel_post"]
        }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        return NextResponse.json({ 
          error: data.description, 
          url: webhookUrl,
          debug: "Telegram rejected the URL. Ensure the domain is public and HTTPS is valid."
        }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: "Webhook activated!", url: webhookUrl });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
