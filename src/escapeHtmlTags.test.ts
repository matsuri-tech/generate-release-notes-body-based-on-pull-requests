import { escapeHtmlTags, escapeHtmlTagsReplacer } from "./escapeHtmlTags.js";
import { test, expect } from "vitest";

test("<", () => {
  expect(escapeHtmlTagsReplacer("<")).toBe("&lt;");
});
test(">", () => {
  expect(escapeHtmlTagsReplacer(">")).toBe("&gt;");
});
test("unexpected substring", () => {
  expect(() => {
    escapeHtmlTagsReplacer("&");
  }).toThrow();
});

[
  {
    description: "basic",
    input: "<div/> <div /> <<div>> < < div > >",
    output: `&lt;div/&gt; &lt;div /&gt; &lt;&lt;div&gt;&gt; &lt; &lt; div &gt; &gt;`,
  },
].forEach(({ description, input, output }) => {
  test(description, () => {
    expect(escapeHtmlTags(input)).toStrictEqual(output);
  });
});
