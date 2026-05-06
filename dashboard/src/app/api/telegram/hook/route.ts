import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  const body = await req.json();
  const msg = body.message;

  if (!msg || !msg.text) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id.toString();
  const rawText = msg.text as string;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) return NextResponse.json({ ok: true });

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || process.env.GITHUB_SECRET });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    const args = rawText.split(" ");
    const command = args[0].toLowerCase().split("@")[0]; 

    const knownCommands = ["/start", "/help", "/tasks", "/task", "/summary", "/new", "/broadcast", "/agents", "/status", "/bootstrap"];
    if (!knownCommands.includes(command)) {
      if (msg.chat.type === "private") {
        await sendTelegramMessage(botToken, chatId, "❌ 未知指令。输入 /help 查看可用命令。");
      }
      return NextResponse.json({ ok: true });
    }

    if (command === "/start" || command === "/help") {
      const helpMsg = "🤖 *Multi-Agent 系统指挥部 (v3.0.2)*\n\n" +
                      "📋 *任务管理*\n" +
                      "• /tasks [skill] - 查看待办 (可选技能过滤)\n" +
                      "• /task <id> - 查看任务详情\n" +
                      "• /summary - 任务进展总览\n" +
                      "• /new <标题> - 快速发布原子任务\n" +
                      "• /broadcast <内容> - 全员广播指令\n\n" +
                      "👥 *智能体管理*\n" +
                      "• /agents - 查看当前在线名册\n" +
                      "• /bootstrap - 获取引导接入命令\n\n" +
                      "⚙️ *系统监控*\n" +
                      "• /status - 检查集群健康度";
      await sendTelegramMessage(botToken, chatId, helpMsg);
    } 
    else if (command === "/tasks") {
      const skillFilter = args[1];
      const labels = ["task"];
      if (skillFilter) labels.push(`skill/${skillFilter}`);
      const { data: issues } = await octokit.rest.issues.listForRepo({
        owner, repo, labels: labels.join(","), state: "open", per_page: 10
      });
      if (issues.length === 0) {
        await sendTelegramMessage(botToken, chatId, "📭 暂无待办任务");
      } else {
        let taskList = "📋 *待办任务列表*:\n\n";
        issues.forEach(issue => {
          taskList += `• [#${issue.number}](${issue.html_url}) ${issue.title}\n`;
        });
        await sendTelegramMessage(botToken, chatId, taskList);
      }
    }
    else if (command === "/task") {
      const issueNumber = parseInt(args[1]);
      if (isNaN(issueNumber)) return await sendTelegramMessage(botToken, chatId, "⚠️ 请输入正确的任务编号");
      const { data: issue } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber });
      const details = `📌 *任务详情 #${issue.number}*\n*标题*: ${issue.title}\n*状态*: ${issue.state}\n🔗 [GitHub](${issue.html_url})`;
      await sendTelegramMessage(botToken, chatId, details);
    }
    else if (command === "/summary") {
      const { data: openTasks } = await octokit.rest.issues.listForRepo({ owner, repo, labels: "task", state: "open" });
      const { data: procTasks } = await octokit.rest.issues.listForRepo({ owner, repo, labels: "task/processing", state: "open" });
      const summary = `📊 *系统任务总览*\n• 🔴 待处理: ${openTasks.length}\n• 🔵 执行中: ${procTasks.length}`;
      await sendTelegramMessage(botToken, chatId, summary);
    }
    else if (command === "/new") {
      const title = args.slice(1).join(" ");
      if (!title) return await sendTelegramMessage(botToken, chatId, "⚠️ 请输入标题");
      const { data: newIssue } = await octokit.rest.issues.create({ owner, repo, title, labels: ["task"] });
      await sendTelegramMessage(botToken, chatId, `✅ 任务创建成功: #${newIssue.number}`);
    }
    else if (command === "/broadcast") {
      const content = args.slice(1).join(" ");
      if (!content) return await sendTelegramMessage(botToken, chatId, "⚠️ 请输入广播内容");
      const { data: newIssue } = await octokit.rest.issues.create({
        owner, repo, title: `[BROADCAST] ${content.substring(0, 30)}`,
        body: `📢 **广播**: ${content}\n请所有 Agent 确认回复。`,
        labels: ["task", "skill/all"]
      });
      await sendTelegramMessage(botToken, chatId, `📢 广播已发布: #${newIssue.number}`);
    }
    else if (command === "/agents") {
      const { data }: any = await octokit.rest.repos.getContent({ owner, repo, path: "agents.json" });
      const config = JSON.parse(Buffer.from(data.content, "base64").toString());
      let agentList = "👥 *智能体名册*\n\n";
      config.agents.forEach((a: any) => { agentList += `• *${a.name}*\n`; });
      await sendTelegramMessage(botToken, chatId, agentList);
    }
    else if (command === "/bootstrap") {
      const host = req.headers.get("host") || "multi-agent-task-dashboard.vercel.app";
      const cmd = "```bash\ncurl -sSL https://" + host + "/bootstrap.sh | bash -s -- $GITHUB_TOKEN \"executor\"\n```";
      await sendTelegramMessage(botToken, chatId, "🚀 *引导接入:*\n\n" + cmd);
    }
    else if (command === "/status") {
      await sendTelegramMessage(botToken, chatId, "✅ *系统状态*: 正常\n时间: " + new Date().toLocaleString());
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[TG Bot Error]", error);
    try {
      await sendTelegramMessage(botToken, chatId, "⚠️ *系统错误*:\n`" + error.message + "`");
    } catch (e) { console.error(e); }
    return NextResponse.json({ ok: true });
  }
}
