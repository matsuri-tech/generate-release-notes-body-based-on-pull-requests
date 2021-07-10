import { mergeBody } from "./mergeBody";
import { makeBody } from "./makeBody";
import { END_COMMENT_OUT, START_COMMENT_OUT } from "./constants";

export const generate = (
  current: string = "",
  sections: Sections,
  prev?: MergedPull
) => {
  const next = makeBody(sections);

  return mergeBody(
    current,
    [
      START_COMMENT_OUT,
      next,
      prev ? `**Prev**: [${prev.title}](${prev.html_url})` : null,
      END_COMMENT_OUT,
    ]
      .filter(Boolean)
      .join("\n\n")
  );
};
