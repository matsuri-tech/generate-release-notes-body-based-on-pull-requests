interface Content {
  scope?: string;
  description: string;
  head_ref: string;
  html_url: string;
}

type MainPrefix = "feat" | "fix";
type OtherPrefix =
  | "build"
  | "ci"
  | "perf"
  | "test"
  | "refactor"
  | "docs"
  | "chore";

type PrefixGroup = MainPrefix | "others";
interface Token extends Content {
  prefix: string;
  prefixGroup: PrefixGroup | undefined;
  breakings:
    | {
        description: string;
        head_ref: string;
        html_url: string;
      }[]
    | undefined;
}

type SectionsKey = PrefixGroup | "breakings";

type Sections = {
  [key: string]: {
    heading: string;
    contents: Content[];
  };
}

interface Pull {
  title: string;
  body: string | null;
  html_url: string;
  head: {
    ref: string;
  };
  merged_at: string | null;
}

interface MergedPull extends Pull {
  merged_at: string;
}

interface Pulls {
  data: Pull[];
}
