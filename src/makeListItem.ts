import { escapeHtmlTags } from "./escapeHtmlTags.js";
export const makeListItem = ({
  scope,
  description,
  html_url,
  head_ref,
}: Sections[string]["contents"][number]) => {
  return [
    "*",
    scope ? `**${scope}**:` : null,
    escapeHtmlTags(description),
    `([${head_ref}](${html_url}))`,
  ]
    .filter(Boolean)
    .join(" ");
};
