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

    // 📩 追加通知逻辑：同步 GitHub 动态到 Telegram
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;

    if (tgToken && tgChatId) {
      const action = payload.action;
      
      // 1. 新任务/新讨论通知
      if (["issues", "discussion"].includes(event!) && (action === "opened" || action === "created")) {
        const title = payload.issue?.title || payload.discussion?.title;
        const sender = payload.sender.login;
        const url = payload.issue?.html_url || payload.discussion?.html_url;

        const msg = `🚀 <b>New Entry in ${repo}</b>\n\n` +
                    `📌 <b>Title</b>: ${title}\n` +
                    `👤 <b>From</b>: ${sender}\n` +
                    `🔗 <a href="${url}">View on GitHub</a>`;
        await sendTelegramMessage(tgToken, tgChatId, msg);
      }

      // 2. 智能体回复通知 (Issue Comment)
      if (event === "issue_comment" && action === "created") {
        const body = payload.comment.body as string;
        const sender = payload.sender.login;
        const issueTitle = payload.issue.title;

        // 只有包含 [Name] 前缀的评论（说明是 Agent 回复）才转发到 TG，防止普通操作干扰
        if (body.startsWith("[") && body.includes("]")) {
          const msg = `💬 <b>Agent Response</b>\n` +
                      `📌 <b>Task</b>: ${issueTitle}\n` +
                      `👤 <b>Sender</b>: ${sender}\n\n` +
                      `${body}`;
          await sendTelegramMessage(tgToken, tgChatId, msg);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
