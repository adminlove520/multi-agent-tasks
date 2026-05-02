import { Octokit } from "octokit";

export async function getRepoInfo(octokit: Octokit) {
  let owner = process.env.NEXT_PUBLIC_REPO_OWNER;
  let repo = process.env.NEXT_PUBLIC_REPO_NAME;

  if (!owner || !repo) {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    owner = user.login;
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });
    // Priority: 'multi-agent-tasks' > most recently updated
    const targetRepo = repos.find((r) => r.name === "multi-agent-tasks") || repos[0];
    repo = targetRepo?.name;
  }

  if (!owner || !repo) {
    throw new Error("Could not determine repository information.");
  }

  return { owner, repo };
}
