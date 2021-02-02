import { makeListItem } from "./makeListItem";

const data = [
  {
    description: "basic",
    input: {
      scope: "scope",
      description: "description",
    },
    output: `* **scope** description`
  },
  {
    description: "no scope conventional commit",
    input: {
      scope: undefined,
      description: "description",
    },
    output: `* description`,
  },
];

data.forEach(({ description, input, output }) => {
  test(description, () => {
    expect(makeListItem(input)).toStrictEqual(output);
  });
});
