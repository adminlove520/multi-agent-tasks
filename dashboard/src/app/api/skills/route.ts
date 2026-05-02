import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const skill = searchParams.get("name");
  const file = searchParams.get("file") || "SKILL.md";
  
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const octokit = new Octokit({ auth: session.accessToken });

  // 1. 自动发现仓库逻辑 (与 tasks 保持一致)
  let owner = process.env.NEXT_PUBLIC_REPO_OWNER;
  let repo = process.env.NEXT_PUBLIC_REPO_NAME;

  if (!owner || !repo) {
    try {
      const { data: user } = await octokit.rest.users.getAuthenticated();
      owner = user.login;
      const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({ sort: "updated" });
      const targetRepo = repos.find(r => r.name === "multi-agent-tasks") || repos[0];
      repo = targetRepo?.name;
    } catch (e) {
      return NextResponse.json({ error: "Failed to discover repo" }, { status: 500 });
    }
  }

  try {
    if (!skill) {
      // 2. 获取 /skills 目录内容
      const { data: contents } = await octokit.rest.repos.getContent({
        owner: owner!,
        repo: repo!,
        path: "skills",
      });

      // GitHub API 如果目录只有一个文件可能会返回对象，通常是数组
      const items = Array.isArray(contents) ? contents : [contents];
      const folders = items
        .filter((c: any) => c.type === "dir" || c.type === "tree")
        .map((c: any) => c.name);
      
      return NextResponse.json(folders);
    }

    // 3. 获取特定文件内容
    const { data: contentFile }: any = await octokit.rest.repos.getContent({
      owner: owner!,
      repo: repo!,
      path: `skills/${skill}/${file}`,
    });

    const decoded = Buffer.from(contentFile.content, "base64").toString("utf-8");
    if (file.endsWith(".md")) {
      return new NextResponse(decoded, {
        headers: { "Content-Type": "text/markdown; charset=utf-8" },
      });
    }
    return NextResponse.json({ content: decoded });

  } catch (error: any) {
    console.error("Skills API Error:", error.message);
    // 如果找不到目录，返回空数组而不是报错
    if (error.status === 404) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
