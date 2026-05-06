import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  const body = await req.json();
  const msg = body.message;

  if (!msg || !msg.text) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id.toString();
  const text = msg.text as string;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) return NextResponse.json({ ok: true });

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || process.env.GITHUB_SECRET });

  try {
    const { owner, repo } = await getRepoInfo(octokit);

    if (text === "/start" || text === "/help") {
      const helpMsg = `🤖 *Multi-Agent Task Bot v3.0*\n\n` +
                      `Available commands:\n` +
                      `• /tasks - List open tasks\n` +
                      `• /bootstrap - Get agent setup command\n` +
                      `• /status - Check system health`;
      await sendTelegramMessage(botToken, chatId, helpMsg);
    } 
    else if (text === "/tasks") {
      const { data: issues } = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        labels: "task",
        state: "open",
        per_page: 5
      });

      if (issues.length === 0) {
        await sendTelegramMessage(botToken, chatId, "📭 No open tasks found.");
      } else {
        let taskList = "📋 *Open Tasks:*\n\n";
        issues.forEach(issue => {
          taskList += `• [#${issue.number}](${issue.html_url}) ${issue.title}\n`;
        });
        await sendTelegramMessage(botToken, chatId, taskList);
      }
    }
    else if (text === "/bootstrap") {
      const baseUrl = `https://${req.headers.get("host")}`;
      const cmd = "```bash\n" +
                  `curl -sSL ${baseUrl}/bootstrap.sh | bash -s -- $GITHUB_TOKEN "executor"\n` +
                  "```";
      await sendTelegramMessage(botToken, chatId, `🚀 *Agent Setup Command:*\n\n${cmd}`);
    }
    else if (text === "/status") {
      const statusMsg = `✅ *System Status*\n\n` +
                        `• Dashboard: Online\n` +
                        `• Webhook: Active\n` +
                        `• Repository: ${owner}/${repo}`;
      await sendTelegramMessage(botToken, chatId, statusMsg);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[TG Bot Error]", error.message);
    return NextResponse.json({ ok: true });
  }
}
