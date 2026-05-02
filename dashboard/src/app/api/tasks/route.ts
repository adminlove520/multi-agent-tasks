import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";

export async function GET() {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: session.accessToken });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
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
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: session.accessToken });
  const { title, body, priority, skill } = await req.json();

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    const { data } = await octokit.rest.issues.create({
      owner,
      repo,
      title: `[TASK] ${title}`,
      body: `## Task Details\n**Source**: Dashboard\n**Priority**: ${priority}\n\n## Instructions\n${body}`,
      labels: ["task", `priority/${priority.toLowerCase()}`, `skill/${skill}`],
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
