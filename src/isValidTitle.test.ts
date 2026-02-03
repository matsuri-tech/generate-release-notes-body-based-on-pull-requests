import { isValidTitle } from "./isValidTitle.js";
import { test, expect } from "vitest";
const data = [
  {
    input: "feat(scope): description",
    output: true,
  },
  {
    input: "feat(scope):           description",
    output: true,
  },
  {
    input: "feat(scope):                description",
    output: true,
  },
  {
    input: "feat(scope_scope): description",
    output: true,
  },
  {
    input: "feat(scope/scope): description",
    output: true,
  },
  {
    input: "feat(scope-scope): description",
    output: true,
  },
  {
    input: "feat: description",
    output: true,
  },
  {
    input: "feat description",
    output: false,
  },
  {
    input: "feat(): description",
    output: false,
  },
  {
    input: "feat:description",
    output: false,
  },
  {
    input: "foat: description",
    output: false,
  },
  {
    input: "feat:",
    output: false,
  },
  {
    input: ":description",
    output: false,
  },
  {
    input: "chore: lighthouse ciを導入",
    output: true,
  },
  {
    input: "build: remove next-offline",
    output: true,
  },
];

data.forEach(({ input, output }) => {
  test(`case: ${input}`, () => {
    expect(isValidTitle(input)).toStrictEqual(output);
  });
});
