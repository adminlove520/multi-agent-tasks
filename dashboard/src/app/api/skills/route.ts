import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const skill = searchParams.get("name");
  const file = searchParams.get("file") || "SKILL.md";
  
  const session: any = await getServerSession(authOptions);
  // Use session token if available, otherwise use a public fallback if the repo is public
  const octokit = new Octokit({ auth: session?.accessToken });

  const owner = process.env.NEXT_PUBLIC_REPO_OWNER || "adminlove520";
  const repo = process.env.NEXT_PUBLIC_REPO_NAME || "multi-agent-tasks";

  try {
    if (!skill) {
      // List all skill folders from the /skills directory in the repo
      const { data: contents } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "skills",
      });

      if (Array.isArray(contents)) {
        return NextResponse.json(contents.filter(c => c.type === "dir").map(c => c.name));
      }
      return NextResponse.json([]);
    }

    // Get specific file from GitHub
    const { data: contentFile }: any = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: `skills/${skill}/${file}`,
    });

    if (contentFile.content) {
      const decoded = Buffer.from(contentFile.content, "base64").toString("utf-8");
      if (file.endsWith(".md")) {
        return new NextResponse(decoded, {
          headers: { "Content-Type": "text/markdown; charset=utf-8" },
        });
      }
      return NextResponse.json({ content: decoded });
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (error: any) {
    console.error("GitHub API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
