import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { botToken: inputToken, action } = await req.json();

  let botToken = inputToken;

  // 如果是掩码值，尝试从环境变量获取（虽然目前 Vercel 没配，但为了健壮性保留）
  if (botToken === "********") {
    botToken = process.env.TELEGRAM_BOT_TOKEN;
  }

  if (!botToken || botToken === "********") {
    return NextResponse.json({ error: "Invalid or missing Bot Token. Please re-enter your token." }, { status: 400 });
  }

  if (action === "activate_webhook") {
    // 1. 确定 Webhook URL (使用与 setup 相同的健壮逻辑)
    let baseUrl = "";
    
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
      baseUrl = process.env.NEXTAUTH_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      const host = req.headers.get("host");
      baseUrl = host ? `https://${host}` : "";
    }

    // 去除末尾斜杠
    baseUrl = baseUrl.replace(/\/$/, "");

    if (!baseUrl) {
      return NextResponse.json({ error: "Could not determine base URL." }, { status: 400 });
    }

    const webhookUrl = `${baseUrl}/api/telegram/hook`;
    
    // 使用 URLSearchParams 确保 URL 被正确编码
    const params = new URLSearchParams({ url: webhookUrl });
    const url = `https://api.telegram.org/bot${botToken}/setWebhook?${params.toString()}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.ok) {
        return NextResponse.json({ 
          error: data.description,
          url: webhookUrl 
        }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Webhook activated!", url: webhookUrl });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
