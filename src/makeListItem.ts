export const makeListItem = ({
  scope,
  description,
}: {
  scope?: string;
  description: string;
}) => {
  return scope ? `* **${scope}** ${description}` : `* ${description}`;
};
