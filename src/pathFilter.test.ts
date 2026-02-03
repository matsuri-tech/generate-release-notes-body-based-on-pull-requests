import {
  getChangedFilesForPR,
  getChangedFilesForPRsBatch,
  matchesPathFilter,
} from "./pathFilter.js";
import { test, expect, vi, describe, beforeEach } from "vitest";

// Mock the octokit object for testing
const mockOctokit = {
  rest: {
    pulls: {
      listFiles: vi.fn(),
    },
  },
  graphql: vi.fn(),
} as any;

const mockRepository = {
  owner: "test-owner",
  repo: "test-repo",
};

describe("pathFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getChangedFilesForPR", () => {
    test("should return files from a single PR", async () => {
      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [{ filename: "src/index.ts" }, { filename: "src/utils.ts" }],
      });

      const files = await getChangedFilesForPR(
        mockOctokit,
        mockRepository,
        123,
      );

      expect(files).toEqual(["src/index.ts", "src/utils.ts"]);
      expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledWith({
        owner: "test-owner",
        repo: "test-repo",
        pull_number: 123,
        page: 1,
        per_page: 100,
      });
    });

    test("should handle pagination", async () => {
      mockOctokit.rest.pulls.listFiles
        .mockResolvedValueOnce({
          data: Array(100)
            .fill(0)
            .map((_, i) => ({ filename: `file${i}.ts` })),
        })
        .mockResolvedValueOnce({
          data: [{ filename: "final.ts" }],
        });

      const files = await getChangedFilesForPR(
        mockOctokit,
        mockRepository,
        123,
      );

      expect(files).toHaveLength(101);
      expect(files[0]).toBe("file0.ts");
      expect(files[100]).toBe("final.ts");
      expect(mockOctokit.rest.pulls.listFiles).toHaveBeenCalledTimes(2);
    });
  });

  describe("getChangedFilesForPRsBatch", () => {
    test("should return empty object for empty input", async () => {
      const result = await getChangedFilesForPRsBatch(
        mockOctokit,
        mockRepository,
        [],
      );
      expect(result).toEqual({});
      expect(mockOctokit.graphql).not.toHaveBeenCalled();
    });

    test("should fetch multiple PRs using GraphQL", async () => {
      const mockGraphQLResponse = {
        repository: {
          pr0: {
            number: 123,
            files: {
              nodes: [{ path: "src/index.ts" }, { path: "src/utils.ts" }],
              pageInfo: { hasNextPage: false },
            },
          },
          pr1: {
            number: 124,
            files: {
              nodes: [{ path: "tests/test.ts" }],
              pageInfo: { hasNextPage: false },
            },
          },
        },
      };

      mockOctokit.graphql.mockResolvedValue(mockGraphQLResponse);

      const result = await getChangedFilesForPRsBatch(
        mockOctokit,
        mockRepository,
        [123, 124],
      );

      expect(result).toEqual({
        123: ["src/index.ts", "src/utils.ts"],
        124: ["tests/test.ts"],
      });
      expect(mockOctokit.graphql).toHaveBeenCalledTimes(1);
    });

    test("should fallback to REST API when GraphQL fails", async () => {
      mockOctokit.graphql.mockRejectedValue(new Error("GraphQL failed"));
      mockOctokit.rest.pulls.listFiles
        .mockResolvedValueOnce({ data: [{ filename: "file1.ts" }] })
        .mockResolvedValueOnce({ data: [{ filename: "file2.ts" }] });

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await getChangedFilesForPRsBatch(
        mockOctokit,
        mockRepository,
        [123, 124],
      );

      expect(result).toEqual({
        123: ["file1.ts"],
        124: ["file2.ts"],
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        "GraphQL batch request failed, falling back to individual requests:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("matchesPathFilter", () => {
    test("should return true when no filters are provided", () => {
      const files = ["src/index.ts", "package.json"];
      const filters: string[] = [];
      expect(matchesPathFilter(files, filters)).toBe(true);
    });

    test("should return true when files match single filter", () => {
      const files = ["src/index.ts", "src/utils.ts"];
      const filters = ["src/"];
      expect(matchesPathFilter(files, filters)).toBe(true);
    });

    test("should return false when no files match filter", () => {
      const files = ["docs/readme.md", "package.json"];
      const filters = ["src/"];
      expect(matchesPathFilter(files, filters)).toBe(false);
    });

    test("should return true when files match any of multiple filters", () => {
      const files = ["docs/readme.md", "src/index.ts"];
      const filters = ["src/", "lib/"];
      expect(matchesPathFilter(files, filters)).toBe(true);
    });

    test("should handle exact file matches", () => {
      const files = ["package.json", "src/index.ts"];
      const filters = ["package.json"];
      expect(matchesPathFilter(files, filters)).toBe(true);
    });

    test("should handle nested path filtering", () => {
      const files = [
        "packages/core/src/index.ts",
        "packages/utils/src/helper.ts",
      ];
      const filters = ["packages/core/"];
      expect(matchesPathFilter(files, filters)).toBe(true);
    });

    test("should be case sensitive", () => {
      const files = ["SRC/index.ts"];
      const filters = ["src/"];
      expect(matchesPathFilter(files, filters)).toBe(false);
    });

    test("should handle multiple filters with mixed results", () => {
      const files = ["backend/api.ts", "frontend/app.ts"];
      const filters = ["backend/", "mobile/"];
      expect(matchesPathFilter(files, filters)).toBe(true);
    });

    test("should return false when files don't match any filter", () => {
      const files = ["docs/readme.md", "scripts/build.sh"];
      const filters = ["src/", "lib/"];
      expect(matchesPathFilter(files, filters)).toBe(false);
    });
  });
});
