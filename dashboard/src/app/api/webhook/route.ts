import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";
import crypto from "crypto";

export async function POST(req: Request) {
  const payload = await req.json();
  const signature = req.headers.get("x-hub-signature-256");
  
  // TODO: Verify signature with WEBHOOK_SECRET for production security

  const event = req.headers.get("x-github-event");
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || process.env.GITHUB_SECRET });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    
    // 只处理感兴趣的事件
    if (!["issues", "discussion", "discussion_comment", "issue_comment"].includes(event!)) {
      return NextResponse.json({ skipped: true });
    }

    const eventData = {
      timestamp: new Date().toISOString(),
      event,
      action: payload.action,
      id: payload.issue?.number || payload.discussion?.number,
      title: payload.issue?.title || payload.discussion?.title,
      sender: payload.sender.login,
      url: payload.issue?.html_url || payload.discussion?.html_url,
    };

    const filePath = "inbox/events.jsonl";
    let content = "";
    let sha: string | undefined = undefined;

    try {
      const { data }: any = await octokit.rest.repos.getContent({ owner, repo, path: filePath });
      content = Buffer.from(data.content, "base64").toString("utf-8");
      sha = data.sha;
    } catch (e) {}

    // 追加新事件
    const updatedContent = content + JSON.stringify(eventData) + "\n";

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: `📩 Webhook: New ${event} event from ${payload.sender.login}`,
      content: Buffer.from(updatedContent).toString("base64"),
      sha,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
