import { describe, expect, it } from "vitest";
import { makeAutoReleasedSection } from "./makeAutoReleasedSection.js";

describe("makeAutoReleasedSection", () => {
  it("should return null when there are no urls", () => {
    expect(makeAutoReleasedSection([])).toBe(null);
  });

  it("should make a section listing auto released pull requests", () => {
    expect(
      makeAutoReleasedSection([
        "https://github.com/matsuri-tech/example/pull/1",
        "https://github.com/matsuri-tech/example/pull/2",
      ]),
    ).toBe(
      [
        "## 自動リリースされたPR一覧",
        "",
        "- https://github.com/matsuri-tech/example/pull/1",
        "- https://github.com/matsuri-tech/example/pull/2",
      ].join("\n"),
    );
  });
});
