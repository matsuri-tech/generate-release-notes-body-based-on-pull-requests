import { parseTitle } from "./parseTitle.js";

const HEADING = "## BREAKING CHANGES";
const SECTION_END_REGEX = /^##? /;
const LIST_ITEM_REGEX = /^\s*[-*]\s+(.+)$/;

export const extractBreakingChanges = (body: string | null): string[] => {
  if (!body) return [];
  const trimmed = body.replace(/\r\n/g, "\n").trimStart();

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

    return sectionLines
      .map((line) => {
        const match = line.match(LIST_ITEM_REGEX);
        return (match ? match[1] : line).trim();
      })
      .filter((entry) => entry.length > 0);
  }

  return [];
};
