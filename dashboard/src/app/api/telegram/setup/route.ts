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

    // 3. 调用 Telegram API (1: 设置 Webhook)
    const setWebhookUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const setCommandsUrl = `https://api.telegram.org/bot${botToken}/setMyCommands`;

    try {
      // 同时执行 Webhook 设置和命令菜单设置
      const [webhookRes, commandsRes] = await Promise.all([
        fetch(setWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: webhookUrl,
            drop_pending_updates: true,
            allowed_updates: ["message", "edited_message", "callback_query", "channel_post", "edited_channel_post"]
          }),
        }),
        fetch(setCommandsUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commands: [
              { command: "tasks", description: "查看待办任务" },
              { command: "summary", description: "查看任务总览" },
              { command: "new", description: "发布新任务 (格式: /new 标题)" },
              { command: "broadcast", description: "全员广播指令 (格式: /broadcast 内容)" },
              { command: "agents", description: "查看在线智能体名册" },
              { command: "status", description: "系统健康检查" },
              { command: "help", description: "查看使用帮助" }
            ]
          }),
        })
      ]);

      const webhookData = await webhookRes.json();
      const commandsData = await commandsRes.json();
      
      if (!webhookData.ok) {
        return NextResponse.json({ 
          error: `Webhook error: ${webhookData.description}`, 
          url: webhookUrl 
        }, { status: 400 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Webhook and Slash Commands activated!", 
        url: webhookUrl,
        menu: commandsData.ok ? "Menu updated" : "Menu update failed"
      });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
