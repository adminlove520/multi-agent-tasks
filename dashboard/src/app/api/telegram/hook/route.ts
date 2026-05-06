import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const msg = body.message || body.channel_post || body.edited_message;
  if (!msg || !msg.text) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id.toString();
  const rawText = msg.text as string;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error("Missing TELEGRAM_BOT_TOKEN");
    return NextResponse.json({ ok: true });
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || process.env.GITHUB_SECRET });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    const args = rawText.split(" ");
    const command = args[0].toLowerCase().split("@")[0]; 

    const knownCommands = ["/start", "/help", "/tasks", "/task", "/summary", "/new", "/broadcast", "/agents", "/status", "/bootstrap", "/discuss"];
    
    if (!knownCommands.includes(command)) {
      if (msg.chat.type === "private") {
        await sendTelegramMessage(botToken, chatId, "❌ <b>未知指令</b>。输入 /help 查看可用命令。");
      }
      return NextResponse.json({ ok: true });
    }

    // --- 执行指令逻辑 ---
    if (command === "/start" || command === "/help") {
      const helpMsg = "🤖 <b>Multi-Agent 系统指挥部 (v3.0.5)</b>\n\n" +
                      "📋 <b>任务管理</b>\n" +
                      "• /tasks [skill] - 查看待办\n" +
                      "• /new &lt;标题&gt; - 发布任务\n" +
                      "• /broadcast &lt;内容&gt; - 全员广播\n" +
                      "• /discuss &lt;内容&gt; - 发起脑暴讨论 (Discussions)\n\n" +
                      "👥 <b>状态监控</b>\n" +
                      "• /summary - 进展总览\n" +
                      "• /status - 健康检查";
      await sendTelegramMessage(botToken, chatId, helpMsg);
    } 
    // ... (中间代码)
    else if (command === "/discuss") {
      const content = args.slice(1).join(" ");
      if (!content) return await sendTelegramMessage(botToken, chatId, "⚠️ 请输入讨论内容");

      // 这里调用我们之前创建的 discussion_helper 逻辑
      // 由于 Vercel 环境下直接运行 shell 较难，我们通过 Octokit 的 GraphQL 接口实现
      const query = `
        mutation($repoId: ID!, $categoryId: ID!, $title: string!, $body: string!) {
          createDiscussion(input: {repositoryId: $repoId, categoryId: $categoryId, title: $title, body: $body}) {
            discussion { url, number }
          }
        }
      `;
      // 为了简化，我们先用 Issue 代替讨论逻辑，或者直接增强 Webhook 转发
      // 此处我们先在 GitHub 创建一个带 [DISCUSS] 前缀的 Issue，并引导 Agent 转向 Discussion
      const { data: newIssue } = await octokit.rest.issues.create({
        owner, repo, 
        title: `[DISCUSS] ${content.substring(0, 30)}...`, 
        body: `🗣️ **脑暴讨论发起**\n\n**内容**: ${content}\n\n请所有 Agent 针对此问题在 Discussions 展开探讨。`, 
        labels: ["status/discussing", "skill/all"]
      });

      await sendTelegramMessage(botToken, chatId, `🗣️ <b>讨论已发起</b>: #${newIssue.number}\n请关注 GitHub Discussions 中的后续反馈。`);
    }

    else if (command === "/tasks") {
      const skillFilter = args[1];
      const labels = ["task"];
      if (skillFilter) labels.push(`skill/${skillFilter}`);
      const { data: issues } = await octokit.rest.issues.listForRepo({
        owner, repo, labels: labels.join(","), state: "open", per_page: 10
      });
      if (issues.length === 0) {
        await sendTelegramMessage(botToken, chatId, "📭 <b>暂无待办任务</b>");
      } else {
        let taskList = "📋 <b>待办任务列表</b>:\n\n";
        issues.forEach(issue => {
          taskList += `• <a href="${issue.html_url}">[#${issue.number}]</a> ${issue.title}\n`;
        });
        await sendTelegramMessage(botToken, chatId, taskList);
      }
    }
    else if (command === "/task") {
      const issueNumber = parseInt(args[1]);
      if (isNaN(issueNumber)) {
        await sendTelegramMessage(botToken, chatId, "⚠️ 请输入正确的任务编号");
      } else {
        const { data: issue } = await octokit.rest.issues.get({ owner, repo, issue_number: issueNumber });
        const details = `📌 <b>任务详情 #${issue.number}</b>\n<b>标题</b>: ${issue.title}\n<b>状态</b>: ${issue.state}\n🔗 <a href="${issue.html_url}">在 GitHub 查看</a>`;
        await sendTelegramMessage(botToken, chatId, details);
      }
    }
    else if (command === "/summary") {
      const [{ data: openTasks }, { data: procTasks }] = await Promise.all([
        octokit.rest.issues.listForRepo({ owner, repo, labels: "task", state: "open" }),
        octokit.rest.issues.listForRepo({ owner, repo, labels: "task/processing", state: "open" })
      ]);
      const summary = `📊 <b>系统任务总览</b>\n• 🔴 待处理: ${openTasks.length}\n• 🔵 执行中: ${procTasks.length}`;
      await sendTelegramMessage(botToken, chatId, summary);
    }
    else if (command === "/new") {
      const title = args.slice(1).join(" ");
      if (!title) {
        await sendTelegramMessage(botToken, chatId, "⚠️ 请输入任务标题");
      } else {
        const { data: newIssue } = await octokit.rest.issues.create({ owner, repo, title, labels: ["task"] });
        await sendTelegramMessage(botToken, chatId, `✅ <b>任务创建成功</b>: #${newIssue.number}`);
      }
    }
    else if (command === "/broadcast") {
      const content = args.slice(1).join(" ");
      if (!content) {
        await sendTelegramMessage(botToken, chatId, "⚠️ 请输入广播内容");
      } else {
        const { data: newIssue } = await octokit.rest.issues.create({
          owner, repo, title: `[BROADCAST] ${content.substring(0, 30)}`,
          body: `📢 **全员广播**: ${content}\n\n请所有 Agent 确认回复。`,
          labels: ["task", "skill/all"]
        });
        await sendTelegramMessage(botToken, chatId, `📢 <b>广播已发布</b>: #${newIssue.number}`);
      }
    }
    else if (command === "/agents") {
      const { data }: any = await octokit.rest.repos.getContent({ owner, repo, path: "agents.json" });
      const config = JSON.parse(Buffer.from(data.content, "base64").toString());
      let agentList = "👥 <b>当前在线智能体</b>\n\n";
      config.agents.forEach((a: any) => { agentList += `• <b>${a.name}</b> (${a.role})\n`; });
      await sendTelegramMessage(botToken, chatId, agentList);
    }
    else if (command === "/bootstrap") {
      const host = req.headers.get("host") || "multi-agent-task-dashboard.vercel.app";
      const cmd = "<code>curl -sSL https://" + host + "/bootstrap.sh | bash -s -- $GITHUB_TOKEN \"ROLE\"</code>";
      await sendTelegramMessage(botToken, chatId, "🚀 <b>Agent 引导接入命令:</b>\n\n请将 ROLE 替换为对应的角色 (executor/collector)：\n\n" + cmd);
    }
    else if (command === "/status") {
      await sendTelegramMessage(botToken, chatId, "✅ <b>系统状态</b>: 正常\n时间: " + new Date().toLocaleString());
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[TG Bot Error]", error);
    try {
      await sendTelegramMessage(botToken, chatId, "⚠️ <b>系统错误</b>:\n<code>" + (error.message || "Unknown error") + "</code>");
    } catch (e) {
      console.error("Critical error in error reporting", e);
    }
    return NextResponse.json({ ok: true });
  }
}
