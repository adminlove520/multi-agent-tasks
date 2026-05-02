# GitHub 登录与 Vercel 部署详细配置指南

本中心化系统使用 GitHub OAuth 作为用户认证方案。以下是详细的配置步骤。

---

## 1. 创建 GitHub OAuth App

1.  登录 GitHub，点击右上角头像，进入 **Settings**。
2.  在左侧边栏最下方找到 **Developer settings**。
3.  点击 **OAuth Apps** -> **New OAuth App**。
4.  填写应用信息：
    *   **Application name**: `Multi-Agent Task Dashboard` (或其他你喜欢的名字)。
    *   **Homepage URL**: 你的 Vercel 部署地址（例如 `https://multi-agent-task-dashboard.vercel.app`）。
    *   **Authorization callback URL**: 必须填写为 `你的域名/api/auth/callback/github`（例如 `https://multi-agent-task-dashboard.vercel.app/api/auth/callback/github`）。
5.  点击 **Register application**。
6.  在生成的页面中：
    *   记录下 **Client ID**。
    *   点击 **Generate a new client secret**，并立即保存生成的 **Client Secret**（它只会出现一次）。

---

## 2. 配置 Vercel 环境变量

进入你的 Vercel 项目控制台 -> **Settings** -> **Environment Variables**，添加以下变量：

| 变量名 | 示例值 | 说明 |
| :--- | :--- | :--- |
| `GITHUB_ID` | `Iv1.xxxxxxxxxxxx` | 刚才获取的 Client ID |
| `GITHUB_SECRET` | `xxxxxxxxxxxxxxxx` | 刚才获取的 Client Secret |
| `NEXTAUTH_SECRET` | `随便输入一段长字符` | 用于加密 Session，可用 `openssl rand -base64 32` 生成 |
| `NEXTAUTH_URL` | `https://你的域名.vercel.app` | 你的线上访问地址 |
| `NEXT_PUBLIC_REPO_OWNER` | `adminlove520` | (可选) 强制指定仓库所有者 |
| `NEXT_PUBLIC_REPO_NAME` | `multi-agent-tasks` | (可选) 强制指定任务仓库名 |

> **注意**：如果未指定 `NEXT_PUBLIC_REPO_*`，看板会根据登录用户自动寻找同名仓库。

---

## 3. 本地测试配置

如果你想在本地开发环境 (`localhost:3000`) 测试：
1.  你需要在 GitHub 额外创建一个 OAuth App，回调地址设为 `http://localhost:3000/api/auth/callback/github`。
2.  在 `dashboard/.env` 文件中配置对应的 ID 和 Secret。

---

## 4. 权限说明

看板在登录时会申请 `repo` 和 `read:user` 权限。
*   `repo`: 用于读写 Issue 以及自动发现私有仓库。
*   `read:user`: 用于获取当前登录的用户名。

如果你担心权限过大，可以创建一个专门用于管理任务的机器人账号。
