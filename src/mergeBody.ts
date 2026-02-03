import { CONTENT_REGEXP } from "./constants.js";

export const mergeBody = (current: string = "", next: string = "") => {
  return current
    ? CONTENT_REGEXP.test(current)
      ? current.replace(CONTENT_REGEXP, next)
      : [current, next].join("\n")
    : next;
};
