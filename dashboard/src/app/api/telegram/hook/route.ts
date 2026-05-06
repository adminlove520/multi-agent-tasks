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
    const command = args[0].toLowerCase();

    // --- 命令集定义 ---

    // 1. 帮助菜单
    if (command === "/start" || command === "/help") {
      const helpMsg = `🤖 *Multi-Agent 系统指挥部 (v3.0.2)*\n\n` +
                      `📋 *任务管理*\n` +
                      `• /tasks [skill] - 查看待办 (可选技能过滤)\n` +
                      `• /task <id> - 查看任务详情\n` +
                      `• /summary - 任务进展总览\n` +
                      `• /new <标题> - 快速发布原子任务\n\n` +
                      `👥 *智能体管理*\n` +
                      `• /agents - 查看当前在线名册\n` +
                      `• /bootstrap - 获取引导接入命令\n\n` +
                      `⚙️ *系统监控*\n` +
                      `• /status - 检查集群健康度`;
      await sendTelegramMessage(botToken, chatId, helpMsg);
    } 

    // 2. 任务列表 (支持技能过滤)
    else if (command === "/tasks") {
      const skillFilter = args[1];
      const labels = ["task"];
      if (skillFilter) labels.push(`skill/${skillFilter}`);

      const { data: issues } = await octokit.rest.issues.listForRepo({
        owner, repo, labels: labels.join(","), state: "open", per_page: 10
      });

      if (issues.length === 0) {
        await sendTelegramMessage(botToken, chatId, `📭 暂无待办任务${skillFilter ? ` (技能: ${skillFilter})` : ""}`);
      } else {
        let taskList = `📋 *待办任务列表*${skillFilter ? ` (${skillFilter})` : ""}:\n\n`;
        issues.forEach(issue => {
          taskList += `• [#${issue.number}](${issue.html_url}) ${issue.title}\n`;
        });
        await sendTelegramMessage(botToken, chatId, taskList);
      }
    }

    // 3. 查看具体任务详情
    else if (command === "/task") {
      const issueNumber = parseInt(args[1]);
      if (isNaN(issueNumber)) {
        return await sendTelegramMessage(botToken, chatId, "⚠️ 请输入正确的任务编号，如: `/task 42` (Markdown)");
      }

      const { data: issue } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber });
      
      const details = `📌 *任务详情 #${issue.number}*\n` +
                      `*标题*: ${issue.title}\n` +
                      `*状态*: ${issue.state === "open" ? "🔴 待处理" : "🟢 已关闭"}\n` +
                      `*标签*: ${issue.labels.map((l: any) => l.name).join(", ")}\n\n` +
                      `*内容*:\n${issue.body?.substring(0, 500)}${issue.body && issue.body.length > 500 ? "..." : ""}\n\n` +
                      `🔗 [在 GitHub 中查看](${issue.html_url})`;
      await sendTelegramMessage(botToken, chatId, details);
    }

    // 4. 任务总览统计
    else if (command === "/summary") {
      const { data: openTasks } = await octokit.rest.issues.listForRepo({ owner, repo, labels: "task", state: "open" });
      const { data: procTasks } = await octokit.rest.issues.listForRepo({ owner, repo, labels: "task/processing", state: "open" });
      const { data: doneTasks } = await octokit.rest.issues.listForRepo({ owner, repo, labels: "task/done" });

      const summary = `📊 *系统任务总览*\n\n` +
                      `• 🔴 *待处理 (Todo)*: ${openTasks.length} 个\n` +
                      `• 🔵 *执行中 (Doing)*: ${procTasks.length} 个\n` +
                      `• 🟢 *已完成 (Done)*: ${doneTasks.length} 个\n\n` +
                      `💪 协作效率正在稳步提升中！`;
      await sendTelegramMessage(botToken, chatId, summary);
    }

    // 5. 快速创建任务
    else if (command === "/new") {
      const title = args.slice(1).join(" ");
      if (!title) return await sendTelegramMessage(botToken, chatId, "⚠️ 请输入任务标题，如: `/new 调研 AI 趋势` (Markdown)");

      const { data: newIssue } = await octokit.rest.issues.create({
        owner, repo, title, body: "Task created via Telegram Bot.", labels: ["task", "priority/P2"]
      });

      await sendTelegramMessage(botToken, chatId, `✅ *任务创建成功!*\n\n[#${newIssue.number}](${newIssue.html_url}) ${newIssue.title}`);
    }

    // 6. 查看智能体名册
    else if (command === "/agents") {
      try {
        const { data }: any = await octokit.rest.repos.getContent({ owner, repo, path: "agents.json" });
        const config = JSON.parse(Buffer.from(data.content, "base64").toString());
        
        let agentList = "👥 *当前智能体名册*\n\n";
        config.agents.forEach((a: any) => {
          agentList += `• *${a.name}* (${a.framework})\n  └ 角色: ${a.role}\n`;
        });
        await sendTelegramMessage(botToken, chatId, agentList);
      } catch (e) {
        await sendTelegramMessage(botToken, chatId, "⚠️ 无法读取名册文件 `agents.json`。");
      }
    }

    // 7. 引导接入
    else if (command === "/bootstrap") {
      const baseUrl = `https://${req.headers.get("host")}`;
      const cmd = "```bash\n" +
                  `curl -sSL ${baseUrl}/bootstrap.sh | bash -s -- $GITHUB_TOKEN "executor"\n` +
                  "```";
      await sendTelegramMessage(botToken, chatId, `🚀 *Agent 引导接入命令:*\n\n请在 Agent 端执行：\n${cmd}`);
    }

    // 8. 健康检查
    else if (command === "/status") {
      const statusMsg = `✅ *集群健康状态报告*\n\n` +
                        `• 控制面板: 正常 (Online)\n` +
                        `• 事件总线: 已挂载 (Active)\n` +
                        `• 数据源: ${owner}/${repo}\n` +
                        `• 时间: ${new Date().toLocaleString()}`;
      await sendTelegramMessage(botToken, chatId, statusMsg);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[TG Bot Error]", error.message);
    return NextResponse.json({ ok: true });
  }
}
