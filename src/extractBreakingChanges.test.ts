import { extractBreakingChanges } from "./extractBreakingChanges.js";
import { test, expect } from "vitest";

const cases: {
  description: string;
  input: string | null;
  output: string[];
}[] = [
  {
    description: "single-line pattern at the top",
    input: "BREAKING CHANGE: API のレスポンス形式を変更",
    output: ["API のレスポンス形式を変更"],
  },
  {
    description: "single-line pattern with plural BREAKING CHANGES",
    input: "BREAKING CHANGES: 設定ファイル名を変更",
    output: ["設定ファイル名を変更"],
  },
  {
    description: "single-line pattern after leading whitespace/newlines",
    input: "\n\n  BREAKING CHANGE: foo\n\n詳細...",
    output: ["foo"],
  },
  {
    description: "heading pattern with bullet list",
    input: "## BREAKING CHANGES\n- item 1\n- item 2",
    output: ["- item 1\n- item 2"],
  },
  {
    description: "heading pattern terminated by next ## heading",
    input:
      "## BREAKING CHANGES\nSome prose\nacross lines\n\n## Summary\nrest",
    output: ["Some prose\nacross lines"],
  },
  {
    description:
      "heading pattern does not terminate at ### (only ## or # same/higher level)",
    input: "## BREAKING CHANGES\n### 詳細\nfoo\n## Next",
    output: ["### 詳細\nfoo"],
  },
  {
    description: "heading pattern terminated by next # heading",
    input: "## BREAKING CHANGES\nfoo\n# Another top heading\nbar",
    output: ["foo"],
  },
  {
    description: "heading pattern extends to end of body when no further heading",
    input: "## BREAKING CHANGES\nonly content here",
    output: ["only content here"],
  },
  {
    description: "heading pattern after leading whitespace/newlines",
    input: "\n\n## BREAKING CHANGES\ncontent",
    output: ["content"],
  },
  {
    description: "BREAKING CHANGE appearing in the middle is NOT extracted",
    input: "Some description\nBREAKING CHANGE: should be ignored",
    output: [],
  },
  {
    description: "## BREAKING CHANGES heading in the middle is NOT extracted",
    input: "## Summary\nfoo\n\n## BREAKING CHANGES\n- ignored",
    output: [],
  },
  {
    description: "heading with trailing text on the same line is NOT extracted",
    input: "## BREAKING CHANGES extra text\ncontent",
    output: [],
  },
  {
    description: "BREAKING CHANGE without colon yields no extraction",
    input: "BREAKING CHANGE",
    output: [],
  },
  {
    description: "null body",
    input: null,
    output: [],
  },
  {
    description: "empty body",
    input: "",
    output: [],
  },
  {
    description: "body with no breaking changes",
    input: "feat: 普通の説明文\n\nもう少し詳しい説明",
    output: [],
  },
  {
    description: "heading with empty section yields no extraction",
    input: "## BREAKING CHANGES\n\n## Summary\nfoo",
    output: [],
  },
];

cases.forEach(({ description, input, output }) => {
  test(description, () => {
    expect(extractBreakingChanges(input)).toStrictEqual(output);
  });
});
