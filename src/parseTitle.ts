export const PARSE_TITLE_INVALID_FORMAT_ERROR =
  "The format of the commit message is invalid, follow conventional commits as `<type>[optional scope]: <description>`.";

export const parseTitle = (
  title: string
): {
  prefix: string;
  scope?: string;
  description: string;
} => {
  const [label, description] = title.split(/:+(.*)/);

  if (description === undefined) {
    throw new Error(PARSE_TITLE_INVALID_FORMAT_ERROR);
  }

  const [prefix, scope] = label.split(/\(|\)/);

  return {
    prefix,
    scope,
    description: description.trim(),
  };
};
