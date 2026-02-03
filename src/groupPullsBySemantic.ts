import { isValidTitle } from "./isValidTitle.js";
import { parseTitle } from "./parseTitle.js";

export const groupPullsBySemantic = (
  pulls: {
    title: string;
    body: string | null;
    html_url: string;
    head: {
      ref: string;
    };
  }[],
) => {
  const sections: Sections = {
    breakings: {
      heading: "BREAKING CHANGES",
      contents: [],
    },
    feat: {
      heading: "Features",
      contents: [],
    },
    fix: {
      heading: "Fixtures",
      contents: [],
    },
    others: {
      heading: "Others",
      contents: [],
    },
  };

  pulls.map((pull) => {
    if (isValidTitle(pull.title) === false) {
      console.log(
        pull.title,
        ":",
        "This pull request is an invalid format. see https://github.com/matsuri-tech/generate-release-notes-body-based-on-pull-requests/blob/main/src/isValidTitle.ts",
      );
      return false;
    }
    const { prefix, scope, description } = parseTitle(pull.title);

    console.log(pull.title, ":", "parsed", "=>", prefix, scope, description);

    // breaking changes
    const breakings = pull.body?.match(/^BREAKING CHANGE.*/gm);

    const identifier = { head_ref: pull.head.ref, html_url: pull.html_url };

    if (breakings) {
      breakings.map((breaking) => {
        const { description } = parseTitle(breaking);
        sections.breakings.contents.unshift({
          description,
          ...identifier,
        });
      });
    }
    // main prefixes
    if (["feat", "fix"].includes(prefix)) {
      sections[prefix].contents.unshift({
        scope,
        description,
        ...identifier,
      });
      // other prefixes
    } else if (
      ["build", "ci", "perf", "test", "refactor", "docs"].includes(prefix)
    ) {
      sections.others.contents.unshift({
        scope: scope || prefix,
        description,
        ...identifier,
      });
      // chore prefix
    } else if (["chore"].includes(prefix)) {
      sections.others.contents.unshift({
        scope,
        description,
        ...identifier,
      });
    }
  });

  return sections;
};
