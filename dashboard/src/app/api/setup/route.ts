import { Octokit } from "octokit";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const octokit = new Octokit({ auth: session.accessToken });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    
    // 1. 获取当前 Webhooks 列表，避免重复
    const { data: hooks } = await octokit.rest.repos.listWebhooks({ owner, repo });
    
    const baseUrl = process.env.NEXTAUTH_URL || `https://${process.env.VERCEL_URL}`;
    const webhookUrl = `${baseUrl}/api/webhook`;

    const existingHook = hooks.find(h => h.config.url === webhookUrl);

    if (existingHook) {
      return NextResponse.json({ success: true, message: "Webhook already exists", id: existingHook.id });
    }

    // 2. 创建新 Webhook
    const secret = process.env.WEBHOOK_SECRET || "multi-agent-secret-123"; // 建议通过环境变量配置

    const { data: newHook } = await octokit.rest.repos.createWebhook({
      owner,
      repo,
      name: "web",
      active: true,
      events: ["issues", "issue_comment", "discussion", "discussion_comment"],
      config: {
        url: webhookUrl,
        content_type: "json",
        secret: secret,
        insecure_ssl: "0",
      },
    });

    return NextResponse.json({ success: true, id: newHook.id });
  } catch (error: any) {
    console.error("Setup Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
