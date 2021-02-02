import { END_COMMENT_OUT, START_COMMENT_OUT } from "./constants";
import { makeListItem } from "./makeListItem";

export const makeBody = (sections: Sections) => {
  const inner = Object.entries(sections)
    .map((section) => {
      const { contents, heading } = section[1];
      if (contents.length === 0) {
        return null;
      } else {
        return [`## ${heading}`, contents.map(makeListItem).join("\n")].join(
          "\n"
        );
      }
    })
    .filter(Boolean)
    .join("\n\n");
  if (inner) {
    return [START_COMMENT_OUT, inner, END_COMMENT_OUT].join("\n\n");
  } else {
    return "";
  }
};
