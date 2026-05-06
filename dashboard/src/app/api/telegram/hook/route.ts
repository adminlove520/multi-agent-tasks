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
    // --- 命令解析 (支持 /command@botname) ---

    const args = rawText.split(" ");
    const fullCommand = args[0].toLowerCase();
    const command = fullCommand.split("@")[0];
    const targetBot = fullCommand.split("@")[1];

    // 如果指定了目标机器人，且不是当前机器人，则忽略
    // 注意：botToken 格式为 id:secret，我们通过 getMe 获取 username
    const meRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meRes.json();
    const myUsername = meData.result?.username?.toLowerCase();

    if (targetBot && myUsername && targetBot !== myUsername) {
      return NextResponse.json({ ok: true });
    }

    const knownCommands = ["/start", "/help", "/tasks", "/task", "/summary", "/new", "/broadcast", "/agents", "/status", "/bootstrap", "/discuss"];
    
    if (!knownCommands.includes(command)) {
      if (msg.chat.type === "private") {
        await sendTelegramMessage(botToken, chatId, "❌ <b>未知指令</b>。输入 /help 查看可用命令。");
      }
      return NextResponse.json({ ok: true });
    }

    // --- 智能体路由增强 (TG @ 转 GitHub @agent/) ---
    let processedContent = args.slice(1).join(" ");
    
    // 动态从 agents.json 获取机器人映射
    try {
      const { data: configData }: any = await octokit.rest.repos.getContent({ owner, repo, path: "agents.json" });
      const config = JSON.parse(Buffer.from(configData.content, "base64").toString());
      
      config.agents.forEach((agent: any) => {
        if (agent.tgUsername) {
          const botMention = `@${agent.tgUsername}`;
          const virtualMention = `@agent/${agent.name.toLowerCase().replace(/ /g, "_")}`;
          if (processedContent.toLowerCase().includes(botMention.toLowerCase())) {
            processedContent = processedContent.replace(new RegExp(botMention, "gi"), virtualMention);
          }
        }
      });
    } catch (e) {
      console.warn("Failed to load agents.json for mapping", e);
    }


    // 1. 帮助菜单
    if (command === "/start" || command === "/help") {
      const helpMsg = "🤖 <b>Multi-Agent 系统指挥部 (v3.0.6)</b>\n\n" +
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

    // 2. 讨论指令 (真正的 GitHub Discussions)
    else if (command === "/discuss") {
      const content = processedContent;
      if (!content) return await sendTelegramMessage(botToken, chatId, "⚠️ 请输入讨论内容");

      // 1. 获取 Repository ID 和 Category ID
      const infoQuery = `
        query($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            id
            discussionCategories(first: 10) {
              nodes { id, name }
            }
          }
        }
      `;
      
      const info: any = await octokit.graphql(infoQuery, { owner, repo });
      const repoId = info.repository.id;
      // 优先找 Brainstorming 类别，找不到就用第一个
      const categories = info.repository.discussionCategories.nodes;
      const categoryId = categories.find((c: any) => c.name === "Brainstorming")?.id || categories[0]?.id;

      // 2. 创建讨论
      const createMutation = `
        mutation($repoId: ID!, $catId: ID!, $title: String!, $body: String!) {
          createDiscussion(input: {repositoryId: $repoId, categoryId: $catId, title: $title, body: $body}) {
            discussion { url, number }
          }
        }
      `;

      const result: any = await octokit.graphql(createMutation, {
        repoId,
        catId: categoryId,
        title: `🗣️ [BRAINSTORM] ${content.substring(0, 30)}...`,
        body: `### 🚀 脑暴讨论发起\n\n**发起人**: 指挥官 (via Telegram)\n**核心议题**:\n${content}\n\n@agent/all 请针对此议题给出技术方案或建议。`
      });

      const discussion = result.createDiscussion.discussion;
      await sendTelegramMessage(botToken, chatId, `🗣️ <b>讨论区已开启</b>: <a href="${discussion.url}">#${discussion.number}</a>\nAgent 已被唤醒参与。`);
    }


    // 3. 广播指令
    else if (command === "/broadcast") {
      const content = processedContent;
      if (!content) {
        await sendTelegramMessage(botToken, chatId, "⚠️ 请输入广播内容");
      } else {

        const { data: newIssue } = await octokit.rest.issues.create({
          owner, repo, 
          title: `[BROADCAST] ${content.substring(0, 30)}`,
          body: `📢 **全员广播**: ${content}\n\n请所有 Agent 确认回复。`,
          labels: ["task", "skill/all"]
        });
        await sendTelegramMessage(botToken, chatId, `📢 <b>广播已发布</b>: #${newIssue.number}`);
      }
    }

    // 4. 任务列表
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

    // 5. 其他指令 (Summary, Agents, etc.)
    else if (command === "/summary") {
      const [{ data: openTasks }, { data: procTasks }] = await Promise.all([
        octokit.rest.issues.listForRepo({ owner, repo, labels: "task", state: "open" }),
        octokit.rest.issues.listForRepo({ owner, repo, labels: "task/processing", state: "open" })
      ]);
      const summary = `📊 <b>系统任务总览</b>\n• 🔴 待处理: ${openTasks.length}\n• 🔵 执行中: ${procTasks.length}`;
      await sendTelegramMessage(botToken, chatId, summary);
    }
    else if (command === "/status") {
      await sendTelegramMessage(botToken, chatId, "✅ <b>系统状态</b>: 正常\n时间: " + new Date().toLocaleString());
    }
    else if (command === "/agents") {
      const { data }: any = await octokit.rest.repos.getContent({ owner, repo, path: "agents.json" });
      const config = JSON.parse(Buffer.from(data.content, "base64").toString());
      let agentList = "👥 <b>当前在线智能体</b>\n\n";
      config.agents.forEach((a: any) => { agentList += `• <b>${a.name}</b> (${a.role})\n`; });
      await sendTelegramMessage(botToken, chatId, agentList);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[TG Bot Error]", error);
    try {
      await sendTelegramMessage(botToken, chatId, "⚠️ <b>系统错误</b>:\n<code>" + (error.message || "Unknown error") + "</code>");
    } catch (e) { console.error(e); }
    return NextResponse.json({ ok: true });
  }
}
