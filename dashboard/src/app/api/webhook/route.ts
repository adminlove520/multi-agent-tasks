import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";
import crypto from "crypto";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const secret = process.env.WEBHOOK_SECRET;

  // ... (Verify signature code remains)

  const payload = JSON.parse(body);
  const event = req.headers.get("x-github-event");
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || process.env.GITHUB_SECRET });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    
    // ... (Event processing code remains)

    // 📩 追加通知逻辑：如果是 Issue 或 Discussion，发送 TG 提醒
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;

    if (tgToken && tgChatId && ["issues", "discussion"].includes(event!)) {
      const action = payload.action;
      if (action === "opened" || action === "created") {
        const msg = `🚀 *New Task in ${repo}*\n\n` +
                    `📌 *Title*: ${eventData.title}\n` +
                    `👤 *From*: ${eventData.sender}\n` +
                    `🔗 [View on GitHub](${eventData.url})`;
        await sendTelegramMessage(tgToken, tgChatId, msg);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
