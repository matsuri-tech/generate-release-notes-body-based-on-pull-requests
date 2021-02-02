export const START_COMMENT_OUT = "<!--generate-release-notes-body-based-on-pull-requests-->";
export const END_COMMENT_OUT = "<!--generate-release-notes-body-based-on-pull-requests-->";
export const CONTENT_REGEXP = new RegExp(
  `^${START_COMMENT_OUT}[\\s\\S]*${END_COMMENT_OUT}`,
  "gm"
);