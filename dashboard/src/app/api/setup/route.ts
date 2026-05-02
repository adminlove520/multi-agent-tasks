import { Octokit } from "octokit";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const octokit = new Octokit({ auth: (session as any).accessToken });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    
    // 1. 确定 Webhook URL
    let baseUrl = "";
    
    // 优先从环境变量获取，但要清洗
    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost")) {
      baseUrl = process.env.NEXTAUTH_URL;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      const host = req.headers.get("host");
      baseUrl = host ? `https://${host}` : "";
    }

    // 去除末尾斜杠
    baseUrl = baseUrl.replace(/\/$/, "");

    if (!baseUrl) {
      return NextResponse.json({ error: "Could not determine base URL." }, { status: 400 });
    }

    const webhookUrl = `${baseUrl}/api/webhook`;

    // 2. 获取当前 Webhooks 列表，避免重复
    const { data: hooks } = await octokit.rest.repos.listWebhooks({ owner, repo });

    const existingHook = hooks.find(h => h.config.url === webhookUrl);

    if (existingHook) {
      return NextResponse.json({ success: true, message: "Webhook already exists", id: existingHook.id, url: webhookUrl });
    }

    // 2. 创建新 Webhook
    const secret = process.env.WEBHOOK_SECRET || "multi-agent-secret-123";

    try {
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
      return NextResponse.json({ success: true, id: newHook.id, url: webhookUrl });
    } catch (err: any) {
      return NextResponse.json({ 
        error: `GitHub API Error: ${err.message}`, 
        url: webhookUrl,
        owner,
        repo
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Setup Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
