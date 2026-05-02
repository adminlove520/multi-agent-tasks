import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";

const CONFIG_PATH = ".github/telegram.json";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const queryToken = searchParams.get("token");
  const session: any = await getServerSession(authOptions);
  
  const token = queryToken || session?.accessToken || process.env.GITHUB_TOKEN;
  
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: token });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    try {
      const { data }: any = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: CONFIG_PATH,
      });
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return NextResponse.json(JSON.parse(content));
    } catch (e) {
      return NextResponse.json({ botToken: "", chatId: "" });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: session.accessToken });
  const config = await req.json();

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    let sha: string | undefined = undefined;

    try {
      const { data }: any = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: CONFIG_PATH,
      });
      sha = data.sha;
    } catch (e) {}

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: CONFIG_PATH,
      message: "🔧 Update Telegram configuration from dashboard",
      content: Buffer.from(JSON.stringify(config, null, 2)).toString("base64"),
      sha,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
