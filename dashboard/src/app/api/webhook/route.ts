import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";
import crypto from "crypto";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const secret = process.env.WEBHOOK_SECRET;

  if (secret && signature) {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(body).digest("hex");
    if (signature !== digest) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const payload = JSON.parse(body);
  const event = req.headers.get("x-github-event");
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || process.env.GITHUB_SECRET });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    const tgToken = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;

    if (tgToken && tgChatId) {
      const action = payload.action;
      
      // 1. 新任务通知
      if (event === "issues" && action === "opened") {
        const msg = `🚀 <b>New Task in ${repo}</b>\n\n` +
                    `📌 <b>Title</b>: ${payload.issue.title}\n` +
                    `👤 <b>From</b>: ${payload.sender.login}\n` +
                    `🔗 <a href="${payload.issue.html_url}">View on GitHub</a>`;
        await sendTelegramMessage(tgToken, tgChatId, msg);
      }

      // 2. 讨论区动态转发 (Discussion Support)
      if (event === "discussion" || event === "discussion_comment") {
        if (action === "created" || action === "opened") {
          const title = payload.discussion?.title;
          const sender = payload.sender.login;
          const bodyContent = payload.comment?.body || payload.discussion?.body || "";
          const url = payload.discussion?.html_url;

          const msg = `🗣️ <b>Discussion Update</b>\n` +
                      `📌 <b>Topic</b>: ${title}\n` +
                      `👤 <b>Sender</b>: ${sender}\n\n` +
                      `${bodyContent.substring(0, 500)}${bodyContent.length > 500 ? "..." : ""}\n\n` +
                      `🔗 <a href="${url}">View Discussion</a>`;
          await sendTelegramMessage(tgToken, tgChatId, msg);
        }
      }

      // 3. 智能体回复通知 (Issue Comment)
      if (event === "issue_comment" && action === "created") {
        const commentBody = payload.comment.body as string;
        if (commentBody.startsWith("[") && commentBody.includes("]")) {
          const msg = `💬 <b>Agent Response</b>\n` +
                      `📌 <b>Task</b>: ${payload.issue.title}\n` +
                      `👤 <b>Sender</b>: ${payload.sender.login}\n\n` +
                      `${commentBody}`;
          await sendTelegramMessage(tgToken, tgChatId, msg);
        }
      }

      // 4. Webhook 加速器 (Accelerator)
      const agentPings = process.env.AGENT_PINGS;
      if (agentPings) {
        const pings = agentPings.split(",");
        pings.forEach(url => {
          fetch(url.trim(), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event, action, payload })
          }).catch(e => console.error("Ping failed", url, e.message));
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
