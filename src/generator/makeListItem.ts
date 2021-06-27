export const makeListItem = ({
  scope,
  description,
  html_url,
  head_ref,
}: Content) => {
  return scope
    ? `* **${scope}**: ${description} ([${head_ref}](${html_url}))`
    : `* ${description} ([${head_ref}](${html_url}))`;
};
