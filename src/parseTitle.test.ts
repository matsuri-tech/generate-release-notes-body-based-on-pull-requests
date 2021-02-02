import { parseTitle } from "./parseTitle";

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
];

data.forEach(({ description, input, output }) => {
  test(description, () => {
    expect(parseTitle(input)).toStrictEqual(output);
  });
});
