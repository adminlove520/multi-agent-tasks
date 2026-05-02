import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";

const AGENTS_PATH = "agents.json";

export async function GET() {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: session.accessToken });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    try {
      const { data }: any = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: AGENTS_PATH,
      });
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return NextResponse.json(JSON.parse(content));
    } catch (e) {
      // Default initial state
      return NextResponse.json({ agents: [] });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: session.accessToken });
  const { agents } = await req.json();

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    let sha: string | undefined = undefined;

    try {
      const { data }: any = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: AGENTS_PATH,
      });
      sha = data.sha;
    } catch (e) {}

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: AGENTS_PATH,
      message: "🤖 Update agent identities and frameworks from dashboard",
      content: Buffer.from(JSON.stringify({ agents, lastUpdated: new Date().toISOString() }, null, 2)).toString("base64"),
      sha,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
