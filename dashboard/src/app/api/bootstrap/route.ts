import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";

export async function GET() {
  const session: any = await getServerSession(authOptions);
  // Allow public access for bootstrap if needed, but safer with session
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: session.accessToken });

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
