import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queryToken = searchParams.get("token");
  const session: any = await getServerSession(authOptions);
  
  // 优先使用 Query Token (Agent 使用), 其次使用 Session (网页预览使用)
  const token = queryToken || session?.accessToken || process.env.GITHUB_TOKEN;
  
  if (!token) return NextResponse.json({ error: "Unauthorized. Please provide a token." }, { status: 401 });

  const octokit = new Octokit({ auth: token });

  try {
    const { owner, repo } = await getRepoInfo(octokit);

    // Fetch the global protocol from docs/global_protocol_CN.md
    const { data: file }: any = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "docs/global_protocol_CN.md",
    });

    const content = Buffer.from(file.content, "base64").toString("utf-8");
    
    // Wrap the protocol in a system message format that Agents can consume
    const payload = {
      version: "3.0",
      timestamp: new Date().toISOString(),
      protocol: content,
      endpoints: {
        webhook: `https://${process.env.VERCEL_URL || 'multi-agent-task-dashboard.vercel.app'}/api/webhook`,
        inbox: `https://github.com/${owner}/${repo}/blob/main/inbox/events.jsonl`
      }
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
