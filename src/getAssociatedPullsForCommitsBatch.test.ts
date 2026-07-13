import { getAssociatedPullsForCommitsBatch } from "./getAssociatedPullsForCommitsBatch.js";
import { test, expect, vi, describe, beforeEach } from "vitest";

// Mock the octokit object for testing
const mockOctokit = {
  rest: {
    repos: {
      listPullRequestsAssociatedWithCommit: vi.fn(),
    },
  },
  graphql: vi.fn(),
} as any;

const mockRepository = {
  owner: "test-owner",
  repo: "test-repo",
};

const makeGraphQLNode = (number: number) => ({
  number,
  title: `feat: change ${number}`,
  body: `body ${number}`,
  url: `https://github.com/test-owner/test-repo/pull/${number}`,
  mergedAt: "2026-07-01T00:00:00Z",
  headRefName: `feature/${number}`,
});

describe("getAssociatedPullsForCommitsBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should return empty array for empty input", async () => {
    const result = await getAssociatedPullsForCommitsBatch(
      mockOctokit,
      mockRepository,
      [],
    );
    expect(result).toEqual([]);
    expect(mockOctokit.graphql).not.toHaveBeenCalled();
  });

  test("should resolve associated pulls using GraphQL", async () => {
    mockOctokit.graphql.mockResolvedValue({
      repository: {
        commit0: {
          associatedPullRequests: {
            nodes: [makeGraphQLNode(1)],
          },
        },
        commit1: {
          associatedPullRequests: {
            nodes: [makeGraphQLNode(2)],
          },
        },
      },
    });

    const result = await getAssociatedPullsForCommitsBatch(
      mockOctokit,
      mockRepository,
      ["sha0", "sha1"],
    );

    expect(result).toEqual([
      {
        number: 1,
        title: "feat: change 1",
        body: "body 1",
        html_url: "https://github.com/test-owner/test-repo/pull/1",
        merged_at: "2026-07-01T00:00:00Z",
        head: { ref: "feature/1" },
      },
      {
        number: 2,
        title: "feat: change 2",
        body: "body 2",
        html_url: "https://github.com/test-owner/test-repo/pull/2",
        merged_at: "2026-07-01T00:00:00Z",
        head: { ref: "feature/2" },
      },
    ]);
    expect(mockOctokit.graphql).toHaveBeenCalledTimes(1);
    expect(mockOctokit.graphql).toHaveBeenCalledWith(expect.any(String), {
      owner: "test-owner",
      repo: "test-repo",
      sha0: "sha0",
      sha1: "sha1",
    });
  });

  test("should chunk commits into batches of 50", async () => {
    mockOctokit.graphql.mockImplementation(
      async (_query: string, variables: Record<string, string>) => {
        const shaCount = Object.keys(variables).filter((key) =>
          key.startsWith("sha"),
        ).length;
        return {
          repository: Object.fromEntries(
            Array(shaCount)
              .fill(0)
              .map((_, i) => [
                `commit${i}`,
                { associatedPullRequests: { nodes: [] } },
              ]),
          ),
        };
      },
    );

    const shas = Array(120)
      .fill(0)
      .map((_, i) => `sha${i}`);

    await getAssociatedPullsForCommitsBatch(mockOctokit, mockRepository, shas);

    expect(mockOctokit.graphql).toHaveBeenCalledTimes(3);
    // 50 + 50 + 20
    expect(
      Object.keys(mockOctokit.graphql.mock.calls[0][1]).filter((key: string) =>
        key.startsWith("sha"),
      ),
    ).toHaveLength(50);
    expect(
      Object.keys(mockOctokit.graphql.mock.calls[2][1]).filter((key: string) =>
        key.startsWith("sha"),
      ),
    ).toHaveLength(20);
  });

  test("should keep duplicated and unmerged pulls as-is", async () => {
    const unmergedNode = {
      ...makeGraphQLNode(3),
      mergedAt: null,
    };
    mockOctokit.graphql.mockResolvedValue({
      repository: {
        commit0: {
          associatedPullRequests: {
            nodes: [makeGraphQLNode(1), unmergedNode],
          },
        },
        commit1: {
          associatedPullRequests: {
            nodes: [makeGraphQLNode(1)],
          },
        },
      },
    });

    const result = await getAssociatedPullsForCommitsBatch(
      mockOctokit,
      mockRepository,
      ["sha0", "sha1"],
    );

    expect(result).toHaveLength(3);
    expect(result[1].merged_at).toBe(null);
  });

  test("should handle commits without associated pulls", async () => {
    mockOctokit.graphql.mockResolvedValue({
      repository: {
        // 存在しないコミットはnullになる
        commit0: null,
        commit1: {
          associatedPullRequests: {
            nodes: [],
          },
        },
      },
    });

    const result = await getAssociatedPullsForCommitsBatch(
      mockOctokit,
      mockRepository,
      ["sha0", "sha1"],
    );

    expect(result).toEqual([]);
  });

  test("should fallback to REST API when GraphQL fails", async () => {
    mockOctokit.graphql.mockRejectedValue(new Error("GraphQL failed"));
    mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit
      .mockResolvedValueOnce({
        data: [
          {
            number: 1,
            title: "feat: change 1",
            body: "body 1",
            html_url: "https://github.com/test-owner/test-repo/pull/1",
            merged_at: "2026-07-01T00:00:00Z",
            head: { ref: "feature/1" },
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [],
      });

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await getAssociatedPullsForCommitsBatch(
      mockOctokit,
      mockRepository,
      ["sha0", "sha1"],
    );

    expect(result).toEqual([
      {
        number: 1,
        title: "feat: change 1",
        body: "body 1",
        html_url: "https://github.com/test-owner/test-repo/pull/1",
        merged_at: "2026-07-01T00:00:00Z",
        head: { ref: "feature/1" },
      },
    ]);
    expect(
      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit,
    ).toHaveBeenCalledTimes(2);
    expect(
      mockOctokit.rest.repos.listPullRequestsAssociatedWithCommit,
    ).toHaveBeenCalledWith({
      owner: "test-owner",
      repo: "test-repo",
      commit_sha: "sha0",
      per_page: 10,
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "GraphQL batch request failed, falling back to individual requests:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
