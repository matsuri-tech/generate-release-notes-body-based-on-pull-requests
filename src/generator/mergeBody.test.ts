import { START_COMMENT_OUT, END_COMMENT_OUT } from "./constants";
import { mergeBody } from "./mergeBody";

const nexts = [
  [
    START_COMMENT_OUT,
    "",
    "## Heading",
    "* **scope**: description",
    "",
    END_COMMENT_OUT,
  ].join("\n"),
  [
    START_COMMENT_OUT,
    "",
    "## Heading",
    "* **scope**: description",
    "",
    "## Heading1",
    "* **scope1**: description1",
    "",
    END_COMMENT_OUT,
  ].join("\n"),
];

const data = [
  {
    description: "basic usage",
    input: {
      current: "Lorem Ipsum",
      next: nexts[0],
    },
    output: ["Lorem Ipsum", nexts[0]].join("\n"),
  },
  {
    description: "generated body only",
    input: {
      current: "",
      next: nexts[0],
    },
    output: nexts[0],
  },
  {
    description: "update generated body",
    input: {
      current: ["Lorem Ipsum", nexts[0]].join("\n"),
      next: nexts[1],
    },
    output: ["Lorem Ipsum", nexts[1]].join("\n"),
  },
  {
    description: "with footer text",
    input: {
      current: ["Lorem Ipsum", nexts[0], "Lorem Ipsum"].join("\n"),
      next: nexts[1],
    },
    output: ["Lorem Ipsum", nexts[1], "Lorem Ipsum"].join("\n"),
  },
];

data.forEach(({ description, input, output }) => {
  test(description, () => {
    expect(mergeBody(input.current, input.next)).toStrictEqual(output);
  });
});
