import { parseTitle } from "./parseTitle.js";

const HEADING = "## BREAKING CHANGES";
const SECTION_END_REGEX = /^##? /;

export const extractBreakingChanges = (body: string | null): string[] => {
  if (!body) return [];
  const trimmed = body.trimStart();

  const singleLineMatch = trimmed.match(/^BREAKING CHANGE.*/);
  if (singleLineMatch) {
    try {
      const { description } = parseTitle(singleLineMatch[0]);
      return [description];
    } catch {
      return [];
    }
  }

  if (trimmed.startsWith(HEADING)) {
    const afterHeading = trimmed.slice(HEADING.length);
    if (afterHeading !== "" && !afterHeading.startsWith("\n")) return [];

    const restLines = afterHeading.split("\n").slice(1);
    const endIndex = restLines.findIndex((line) => SECTION_END_REGEX.test(line));
    const sectionLines = endIndex === -1 ? restLines : restLines.slice(0, endIndex);
    const content = sectionLines.join("\n").trim();
    return content ? [content] : [];
  }

  return [];
};
