import * as github from "@actions/github";

export type AssociatedPull = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  merged_at: string | null;
  head: {
    ref: string;
  };
};

// GitHubのsecondary rate limit（同時リクエスト上限100）を避けるため、
// コミットごとのREST呼び出しではなくGraphQLで複数コミットを1クエリに束ねる
const CHUNK_SIZE = 50;

// 1コミットに紐づくPRは通常1件（+ リリースPR自身）なので10件で十分
const PULLS_PER_COMMIT = 10;

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

type CommitNode = {
  associatedPullRequests?: {
    nodes?: ({
      number: number;
      title: string;
      body: string | null;
      url: string;
      mergedAt: string | null;
      headRefName: string;
    } | null)[];
  };
} | null;

const getAssociatedPullsByGraphQL = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repository: {
    owner: string;
    repo: string;
  },
  commitShas: string[],
): Promise<AssociatedPull[]> => {
  const query = `
    query($owner: String!, $repo: String!, ${commitShas.map((_, i) => `$sha${i}: GitObjectID!`).join(", ")}) {
      repository(owner: $owner, name: $repo) {
        ${commitShas
          .map(
            (_, i) => `
          commit${i}: object(oid: $sha${i}) {
            ... on Commit {
              associatedPullRequests(first: ${PULLS_PER_COMMIT}) {
                nodes {
                  number
                  title
                  body
                  url
                  mergedAt
                  headRefName
                }
              }
            }
          }
        `,
          )
          .join("")}
      }
    }
  `;

  const variables = {
    owner: repository.owner,
    repo: repository.repo,
    ...Object.fromEntries(commitShas.map((sha, i) => [`sha${i}`, sha])),
  };

  const response = await octokit.graphql<{
    repository: Record<string, CommitNode>;
  }>(query, variables);

  const pulls: AssociatedPull[] = [];
  commitShas.forEach((_, i) => {
    const nodes = response.repository[`commit${i}`]?.associatedPullRequests
      ?.nodes;
    if (!nodes) {
      return;
    }
    for (const node of nodes) {
      if (!node) {
        continue;
      }
      pulls.push({
        number: node.number,
        title: node.title,
        body: node.body,
        html_url: node.url,
        merged_at: node.mergedAt,
        head: {
          ref: node.headRefName,
        },
      });
    }
  });

  return pulls;
};

const getAssociatedPullsByRest = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repository: {
    owner: string;
    repo: string;
  },
  commitShas: string[],
): Promise<AssociatedPull[]> => {
  const pulls: AssociatedPull[] = [];

  // 並列で投げるとsecondary rate limitに触れるため直列で呼び出す
  for (const sha of commitShas) {
    const { data } =
      await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
        ...repository,
        commit_sha: sha,
        // GraphQL経路の associatedPullRequests(first: PULLS_PER_COMMIT) と
        // 結果件数の上限を揃え、経路によって挙動が変わらないようにする
        per_page: PULLS_PER_COMMIT,
      });
    for (const pull of data) {
      pulls.push({
        number: pull.number,
        title: pull.title,
        body: pull.body,
        html_url: pull.html_url,
        merged_at: pull.merged_at,
        head: {
          ref: pull.head.ref,
        },
      });
    }
  }

  return pulls;
};

// 各コミットに紐づくPRをGraphQLでまとめて解決する。
// 戻り値は全コミット分をflattenしたもので、重複・未マージPRを含む。
export const getAssociatedPullsForCommitsBatch = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repository: {
    owner: string;
    repo: string;
  },
  commitShas: string[],
): Promise<AssociatedPull[]> => {
  const pulls: AssociatedPull[] = [];

  for (const shas of chunk(commitShas, CHUNK_SIZE)) {
    try {
      pulls.push(...(await getAssociatedPullsByGraphQL(octokit, repository, shas)));
    } catch (error) {
      // Fallback to individual REST API calls if GraphQL fails
      console.warn(
        "GraphQL batch request failed, falling back to individual requests:",
        error,
      );
      pulls.push(...(await getAssociatedPullsByRest(octokit, repository, shas)));
    }
  }

  return pulls;
};
