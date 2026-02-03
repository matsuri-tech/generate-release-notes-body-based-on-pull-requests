import * as github from "@actions/github";
import type { GitHub } from "@actions/github/lib/utils";

export const getChangedFilesForPR = async (
  octokit: InstanceType<typeof GitHub>,
  repository: {
    owner: string;
    repo: string;
  },
  pull_number: number,
): Promise<string[]> => {
  const files = [];
  let hasMorePages = true;
  let page = 1;

  while (hasMorePages) {
    const data = await octokit.rest.pulls.listFiles({
      ...repository,
      pull_number,
      page,
      per_page: 100,
    });

    files.push(...data.data.map((file) => file.filename));

    hasMorePages = data.data.length === 100;
    page++;
  }

  return files;
};

// More efficient batch fetching of changed files for multiple PRs using GraphQL
export const getChangedFilesForPRsBatch = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repository: {
    owner: string;
    repo: string;
  },
  pullNumbers: number[],
): Promise<Record<number, string[]>> => {
  if (pullNumbers.length === 0) {
    return {};
  }

  // GraphQL query to fetch multiple PRs with their files in a single request
  const query = `
    query($owner: String!, $repo: String!, ${pullNumbers.map((_, i) => `$pr${i}: Int!`).join(", ")}) {
      repository(owner: $owner, name: $repo) {
        ${pullNumbers
          .map(
            (_, i) => `
          pr${i}: pullRequest(number: $pr${i}) {
            number
            files(first: 100) {
              nodes {
                path
              }
              pageInfo {
                hasNextPage
                endCursor
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
    ...Object.fromEntries(pullNumbers.map((num, i) => [`pr${i}`, num])),
  };

  try {
    const response = await octokit.graphql(query, variables);
    const result: Record<number, string[]> = {};

    pullNumbers.forEach((pullNumber, i) => {
      const prData = (response as any).repository[`pr${i}`];
      if (prData && prData.files && prData.files.nodes) {
        result[pullNumber] = prData.files.nodes.map((file: any) => file.path);

        // Note: This basic implementation only fetches first 100 files per PR
        // In a production scenario, you might want to handle pagination for PRs with >100 files
        if (prData.files.pageInfo.hasNextPage) {
          console.warn(
            `PR #${pullNumber} has more than 100 changed files. Only first 100 are considered.`,
          );
        }
      } else {
        result[pullNumber] = [];
      }
    });

    return result;
  } catch (error) {
    // Fallback to individual REST API calls if GraphQL fails
    console.warn(
      "GraphQL batch request failed, falling back to individual requests:",
      error,
    );
    const result: Record<number, string[]> = {};

    for (const pullNumber of pullNumbers) {
      try {
        result[pullNumber] = await getChangedFilesForPR(
          octokit,
          repository,
          pullNumber,
        );
      } catch (err) {
        console.warn(`Failed to get files for PR #${pullNumber}:`, err);
        result[pullNumber] = [];
      }
    }

    return result;
  }
};

export const matchesPathFilter = (
  files: string[],
  pathFilters: string[],
): boolean => {
  if (pathFilters.length === 0) {
    return true; // No filter specified, include all
  }

  return files.some((file) =>
    pathFilters.some((filter) => file.startsWith(filter.trim())),
  );
};
