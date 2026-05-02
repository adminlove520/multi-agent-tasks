import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";
import crypto from "crypto";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const secret = process.env.WEBHOOK_SECRET;

  // Verify signature if secret is provided
  if (secret && signature) {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = "sha256=" + hmac.update(body).digest("hex");
    if (signature !== digest) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const payload = JSON.parse(body);
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
