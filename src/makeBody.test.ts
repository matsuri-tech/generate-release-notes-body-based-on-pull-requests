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
            head_ref: "feat/#2",
            html_url: "https://example.com"
          },
        ],
      },
    },
    [
      START_COMMENT_OUT,
      "",
      "## Heading",
      "* **scope**: description ([feat/#2](https://example.com))",
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
            head_ref: "feat/#2",
            html_url: "https://example.com"
          },
        ],
      },
      example2: {
        heading: "Heading2",
        contents: [
          {
            scope: "scope2",
            description: "description2",
            head_ref: "feat/#2",
            html_url: "https://example.com"
          },
        ],
      },
    },
    [
      START_COMMENT_OUT,
      "",
      "## Heading1",
      "* **scope1**: description1 ([feat/#2](https://example.com))",
      "",
      "## Heading2",
      "* **scope2**: description2 ([feat/#2](https://example.com))",
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
