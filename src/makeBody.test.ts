import { END_COMMENT_OUT, START_COMMENT_OUT } from "./constants";
import { makeBody } from "./makeBody";


const data: [Sections, string][] = [
  [
    {
      example1: {
        heading: "Heading",
        contents: [
          {
            scope: "scope",
            description: "description",
          },
        ],
      },
    },
    [
      START_COMMENT_OUT,
      "",
      "## Heading",
      "* **scope**: description",
      "",
      END_COMMENT_OUT
    ].join("\n"),
  ],
  [
    {
      example1: {
        heading: "Heading1",
        contents: [
          {
            scope: "scope1",
            description: "description1",
          },
        ],
      },
      example2: {
        heading: "Heading2",
        contents: [
          {
            scope: "scope2",
            description: "description2",
          },
        ],
      },
    },
    [
      START_COMMENT_OUT,
      "",
      "## Heading1",
      "* **scope1**: description1",
      "",
      "## Heading2",
      "* **scope2**: description2",
      "",
      END_COMMENT_OUT
    ].join("\n"),
  ],
  [
    {
      example1: {
        heading: "Heading",
        contents: [],
      },
    },
    "",
  ],
];

data.forEach(([input, output]) => {
  test(JSON.stringify(input), () => {
    expect(makeBody(input)).toStrictEqual(output);
  });
});
