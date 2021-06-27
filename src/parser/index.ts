const MAIN_PREFIXES: MainPrefix[] = ["feat", "fix"];
const OTHER_PREFIXES: OtherPrefix[] = [
  "build",
  "ci",
  "perf",
  "test",
  "refactor",
  "docs",
  "chore",
];

export const parseTitle = ({
  title,
}: Pick<Pull, "title">): {
  prefix: string;
  scope?: string;
  description: string;
} => {
  const [label, description] = title.split(":");
  const [prefix, scope] = label.split(/\(|\)/);
  return {
    prefix,
    scope,
    description: description.trim(),
  };
};

export const parse = ({
  title,
  body,
  head: { ref: head_ref },
  html_url,
}: Pull): Token => {
  const [label, description] = title.split(":");
  const head = label.split(/\(|\)/);
  const prefix = head[0];
  const prefixGroup = MAIN_PREFIXES.includes(prefix as MainPrefix)
    ? (prefix as "feat" | "fix")
    : OTHER_PREFIXES.includes(prefix as OtherPrefix)
    ? ("others" as const)
    : undefined;
  const scope =
    head[1] || (prefixGroup === "others" && prefix !== "chore")
      ? prefix
      : undefined;

  const breakings =
    body?.match(/^BREAKING CHANGE.*/gm)?.map((breaking) => {
      return {
        description: breaking.split(":")?.[1]?.trim(),
        head_ref,
        html_url,
      };
    }) || undefined;

  return {
    prefix,
    prefixGroup,
    scope,
    description: description.trim(),
    breakings,
    head_ref,
    html_url,
  };
};
