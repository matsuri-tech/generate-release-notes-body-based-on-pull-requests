import { extractPullNumber } from "./extractPullNumber.js";
import { test, expect } from "vitest";

const data = [
  {
    description: "merge commit",
    input: "Merge pull request #1008 from matsuri-tech/dependabot/npm_and_yarn/x",
    output: 1008,
  },
  {
    description: "squash merge (Renovate)",
    input:
      "chore(deps): update matsuri-tech/generate-release-notes-body-based-on-pull-requests action to v3.1.0 (#1006)",
    output: 1006,
  },
  {
    description: "rebase merge subject",
    input: "feat(scope): add something (#42)",
    output: 42,
  },
  {
    description: "merge commit takes precedence over trailing reference",
    input: "Merge pull request #1008 from owner/branch (#999)",
    output: 1008,
  },
  {
    description: "only the first line is inspected",
    input: "chore(deps): bump js-yaml (#1008)\n\nFixes #1234",
    output: 1008,
  },
  {
    description: "no PR number in a plain change commit",
    input: "chore(deps): bump js-yaml in the npm_and_yarn group across 1 directory",
    output: undefined,
  },
  {
    description: "ignores a leading or in-body issue reference",
    input: "fix: resolve #123 in the description",
    output: undefined,
  },
];

data.forEach(({ description, input, output }) => {
  test(description, () => {
    expect(extractPullNumber(input)).toBe(output);
  });
});
