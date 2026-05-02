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

  try {
    const { data } = await octokit.rest.issues.listForRepo({
      owner: process.env.NEXT_PUBLIC_REPO_OWNER || "adminlove520",
      repo: process.env.NEXT_PUBLIC_REPO_NAME || "multi-agent-tasks",
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

  try {
    const { data } = await octokit.rest.issues.create({
      owner: process.env.NEXT_PUBLIC_REPO_OWNER || "adminlove520",
      repo: process.env.NEXT_PUBLIC_REPO_NAME || "multi-agent-tasks",
      title: `[TASK] ${title}`,
      body: `## Task Details\n**Source**: Dashboard\n**Priority**: ${priority}\n\n## Instructions\n${body}`,
      labels: ["task", `priority/${priority.toLowerCase()}`, `skill/${skill}`],
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
