import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";
import { encryptSecret } from "@/lib/crypto";

const CONFIG_PATH = ".github/telegram.json";

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
        path: CONFIG_PATH,
      });
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const config = JSON.parse(content);
      
      // 关键：永远不要向前端返回真实的 Token
      return NextResponse.json({
        ...config,
        botToken: config.botToken ? "********" : ""
      });
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
  const { botToken, chatId } = await req.json();

  try {
    const { owner, repo } = await getRepoInfo(octokit);

    // 1. 如果提供了新的 Token，将其保存到 GitHub Secrets
    if (botToken && botToken !== "********") {
      // 获取公钥用于加密
      const { data: publicKey } = await octokit.rest.actions.getRepoPublicKey({ owner, repo });
      const encryptedValue = await encryptSecret(publicKey.key, botToken);

      await octokit.rest.actions.createOrUpdateRepoSecret({
        owner,
        repo,
        secret_name: "TELEGRAM_BOT_TOKEN",
        encrypted_value: encryptedValue,
        key_id: publicKey.key_id,
      });
    }

    // 2. 将非敏感信息保存到 JSON (Token 只保存一个占位符)
    let sha: string | undefined = undefined;
    try {
      const { data }: any = await octokit.rest.repos.getContent({ owner, repo, path: CONFIG_PATH });
      sha = data.sha;
    } catch (e) {}

    const configToSave = {
      chatId,
      botToken: "STORED_IN_GITHUB_SECRETS",
      updatedAt: new Date().toISOString()
    };

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: CONFIG_PATH,
      message: "🔐 Secure Update: Telegram config (tokens moved to Secrets)",
      content: Buffer.from(JSON.stringify(configToSave, null, 2)).toString("base64"),
      sha,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
