export const parseTitle = (
  title: string
): {
  prefix: string;
  scope?: string;
  description: string;
} => {
  const [label, description] = title.split(/:+(.*)/);
  const [prefix, scope] = label.split(/\(|\)/);
  return {
    prefix,
    scope,
    description: description.trim(),
  };
};
