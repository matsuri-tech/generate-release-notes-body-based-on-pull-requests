import { parseTitle, PARSE_TITLE_INVALID_FORMAT_ERROR } from "./parseTitle";

const data = [
  {
    description: "basic",
    input: "feat(scope): description",
    output: {
      prefix: "feat",
      scope: "scope",
      description: "description",
    },
  },
  {
    description: "no scope conventional commit",
    input: "feat: description",
    output: {
      prefix: "feat",
      scope: undefined,
      description: "description",
    },
  },
  {
    description: "correctly parse commit messages with multiple colons",
    input:
      "fix: `writing-mode: vertical-rl` bug on Safari, : to : has :: in it",
    output: {
      prefix: "fix",
      scope: undefined,
      description:
        "`writing-mode: vertical-rl` bug on Safari, : to : has :: in it",
    },
  },
];

data.forEach(({ description, input, output }) => {
  test(description, () => {
    expect(parseTitle(input)).toStrictEqual(output);
  });
});

test("throw an error if the format is invalid", () => {
  expect(() => {
    parseTitle("Feat #1223");
  }).toThrow(PARSE_TITLE_INVALID_FORMAT_ERROR);
});
