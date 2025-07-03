import { matchesPathFilter } from "./pathFilter";

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
    const files = ["packages/core/src/index.ts", "packages/utils/src/helper.ts"];
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