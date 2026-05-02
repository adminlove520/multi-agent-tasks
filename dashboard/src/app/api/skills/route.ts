import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const skill = searchParams.get("name");
  const file = searchParams.get("file") || "SKILL.md";

  if (!skill) {
    // List available skills
    const skillsPath = path.join(process.cwd(), "..", "skills");
    try {
      const folders = fs.readdirSync(skillsPath);
      return NextResponse.json(folders);
    } catch (err) {
      return NextResponse.json({ error: "Skills directory not found" }, { status: 404 });
    }
  }

  // Get specific file content
  const filePath = path.join(process.cwd(), "..", "skills", skill, file);
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, "utf8");
  
  if (file.endsWith(".md")) {
    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  return NextResponse.json({ content });
}
