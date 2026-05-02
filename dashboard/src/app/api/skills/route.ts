import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const skill = searchParams.get("name");
  const file = searchParams.get("file") || "SKILL.md";
  
  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: session.accessToken });

  try {
    const { owner, repo } = await getRepoInfo(octokit);

    if (!skill) {
      const { data: contents } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "skills",
      });
      const items = Array.isArray(contents) ? contents : [contents];
      const folders = items
        .filter((c: any) => c.type === "dir" || c.type === "tree")
        .map((c: any) => c.name);
      return NextResponse.json(folders);
    }

    const { data: contentFile }: any = await octokit.rest.repos.getContent({
      owner,
      repo,
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
    if (error.status === 404) return NextResponse.json([]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
