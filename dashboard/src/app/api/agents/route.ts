import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "octokit";
import { NextResponse } from "next/server";
import { getRepoInfo } from "@/lib/github";
import { encryptSecret } from "@/lib/crypto";

const AGENTS_PATH = "agents.json";

// 全局内存缓存 Agent 心跳 (Node.js 运行时生存周期内有效)
let agentHeartbeats: Record<string, number> = {};

export async function GET() {
  const session: any = await getServerSession(authOptions);
  const token = session?.accessToken || process.env.GITHUB_TOKEN;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: token });

  try {
    const { owner, repo } = await getRepoInfo(octokit);
    try {
      const { data }: any = await octokit.rest.repos.getContent({ owner, repo, path: AGENTS_PATH });
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const config = JSON.parse(content);
      
      const now = Date.now();
      const sanitizedAgents = (config.agents || []).map((agent: any) => ({
        ...agent,
        tgToken: agent.tgToken ? "********" : "",
        // 5分钟内有心跳视为在线
        online: agentHeartbeats[agent.name] && (now - agentHeartbeats[agent.name] < 300000)
      }));

      return NextResponse.json({ agents: sanitizedAgents });
    } catch (e) {
      return NextResponse.json({ agents: [] });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const payload = await req.json();

  // 处理心跳上报 (不需要 Session 校验，通过 Token 校验或简单的 Agent 名称即可)
  if (payload.action === "heartbeat") {
    agentHeartbeats[payload.name] = Date.now();
    return NextResponse.json({ success: true, timestamp: agentHeartbeats[payload.name] });
  }

  const session: any = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const octokit = new Octokit({ auth: session.accessToken });
  const { agents } = payload;


  try {
    const { owner, repo } = await getRepoInfo(octokit);

    // 1. 处理所有 Agent 的 Token 并存入 Secrets
    const { data: publicKey } = await octokit.rest.actions.getRepoPublicKey({ owner, repo });

    const agentsToSave = await Promise.all(agents.map(async (agent: any) => {
      if (agent.tgToken && agent.tgToken !== "********") {
        const encryptedValue = await encryptSecret(publicKey.key, agent.tgToken);
        // 增强命名规范：只允许大写字母、数字和下划线，非 ASCII 字符转换为拼音或 ID
        let safeName = agent.name.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (!safeName || safeName.startsWith('_')) {
          safeName = `ID_${agent.id}`;
        }
        const secretName = `AGENT_${safeName}_TOKEN`;

        await octokit.rest.actions.createOrUpdateRepoSecret({
          owner,
          repo,
          secret_name: secretName,
          encrypted_value: encryptedValue,
          key_id: publicKey.key_id,
        });

        return { ...agent, tgToken: `SECRET:${secretName}` };
      }
      return agent;
    }));

    // 2. 保存非敏感名册
    let sha: string | undefined = undefined;
    try {
      const { data }: any = await octokit.rest.repos.getContent({ owner, repo, path: AGENTS_PATH });
      sha = data.sha;
    } catch (e) {}

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: AGENTS_PATH,
      message: "🔐 Secure Update: Agent registry (tokens moved to Secrets)",
      content: Buffer.from(JSON.stringify({ agents: agentsToSave, lastUpdated: new Date().toISOString() }, null, 2)).toString("base64"),
      sha,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
