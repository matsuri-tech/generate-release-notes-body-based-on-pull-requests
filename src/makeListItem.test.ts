import { makeListItem } from "./makeListItem";

const data = [
  {
    description: "basic",
    input: {
      scope: "scope",
      description: "description",
      head_ref: "feat/#2",
      html_url: "https://example.com"
    },
    output: `* **scope**: description ([feat/#2](https://example.com))`
  },
  {
    description: "no scope conventional commit",
    input: {
      scope: undefined,
      description: "description",
      head_ref: "feat/#2",
      html_url: "https://example.com"
    },
    output: `* description ([feat/#2](https://example.com))`,
  },
];

data.forEach(({ description, input, output }) => {
  test(description, () => {
    expect(makeListItem(input)).toStrictEqual(output);
  });
});
