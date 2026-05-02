import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";

export async function GET() {
  const session: any = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const octokit = new Octokit({ auth: session.accessToken });

  // Auto-discover repo if not specified in env
  let owner = process.env.NEXT_PUBLIC_REPO_OWNER;
  let repo = process.env.NEXT_PUBLIC_REPO_NAME;

  if (!owner || !repo) {
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      owner = user.login;
      // Look for a repo named 'multi-agent-tasks' by default
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
      });
      const targetRepo = repos.find(r => r.name === "multi-agent-tasks") || repos[0];
      repo = targetRepo?.name;
      
      if (!repo) {
        return NextResponse.json({ error: "No repository found" }, { status: 404 });
      }
    } catch (error: any) {
      return NextResponse.json({ error: "Failed to auto-discover repository" }, { status: 500 });
    }
  }

  try {
    const { data } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: "all",
      labels: "task",
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);

  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const octokit = new Octokit({ auth: session.accessToken });
  const { title, body, priority, skill } = await req.json();

  let owner = process.env.NEXT_PUBLIC_REPO_OWNER;
  let repo = process.env.NEXT_PUBLIC_REPO_NAME;

  if (!owner || !repo) {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    owner = user.login;
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({ sort: "updated" });
    const targetRepo = repos.find(r => r.name === "multi-agent-tasks") || repos[0];
    repo = targetRepo?.name;
  }

  try {
    const { data } = await octokit.rest.issues.create({
      owner: owner!,
      repo: repo!,
      title: `[TASK] ${title}`,
      body: `## Task Details\n**Source**: Dashboard\n**Priority**: ${priority}\n\n## Instructions\n${body}`,
      labels: ["task", `priority/${priority.toLowerCase()}`, `skill/${skill}`],
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
