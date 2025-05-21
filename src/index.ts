import * as core from "@actions/core";
import * as github from "@actions/github";
import { parseTitle } from "./parseTitle";
import { makeBody } from "./makeBody";
import { mergeBody } from "./mergeBody";
import { isValidTitle } from "./isValidTitle";
import { END_COMMENT_OUT, START_COMMENT_OUT } from "./constants";

const getAllCommits = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repository: {
    owner: string;
    repo: string;
  },
  pull_number: number
) => {
  const commits = [];
  let hasMorePages = true;
  let page = 0;

  while (hasMorePages) {
    const data = await octokit.rest.pulls.listCommits({
      ...repository,
      pull_number,
      page,
      per_page: 100,
    });
    commits.push(...data.data);

    hasMorePages = data.data.length === 100;
    page++;
  }

  return commits;
};

async function run() {
  try {
    const GITHUB_TOKEN = core.getInput("GITHUB_TOKEN");

    const octokit = github.getOctokit(GITHUB_TOKEN);

    const context = github.context;

    if (context.payload.pull_request === undefined) {
      throw new Error("This action only runs for pull request.");
    }

    const current = await octokit.rest.pulls.get({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
    });

    const RELEASE_PREFIX = core.getInput("RELEASE_PREFIX");
    const RELEASE_LABEL = core.getInput("RELEASE_LABEL");

    if (RELEASE_PREFIX !== parseTitle(current.data.title).prefix) {
      if (isValidTitle(current.data.title) === false) {
        throw new Error("This pull request is an invalid format.");
      }

      core.warning(
        `This title prefix does not match the specified release prefix "${RELEASE_PREFIX}".`
      );
      return;
    }

    try {
      await octokit.rest.issues.addLabels({
        ...context.repo,
        issue_number: context.payload.pull_request.number,
        labels: [RELEASE_LABEL],
      });
    } catch (error: any) {
      core.warning(`Failed to add release label: ${error.message}`);
    }

    const commits = await getAllCommits(
      octokit,
      context.repo,
      current.data.number
    );

    core.debug(`Fetched commits count: ${commits.length}`);
    if (core.isDebug()) {
      core.debug(
        `Commits: ${JSON.stringify(
          commits.map((commit) => {
            return commit.commit.message;
          }),
          null,
          2
        )}`
      );
    }

    const pulls = await Promise.all(
      commits
        .filter((commit) => {
          return commit.commit.message.startsWith("Merge pull request");
        })
        .map(async (commit) => {
          const pull_number = parseInt(
            commit.commit.message.split("#")[1].split(" ")[0],
            10
          );
          const current = await octokit.rest.pulls.get({
            ...context.repo,
            pull_number: pull_number,
          });
          return current.data;
        })
    );

    core.debug(`Detected commits count: ${pulls.length}`);

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
      core.debug(`checking ${pull.title}`);

      if (isValidTitle(pull.title) === false) {
        console.log(
          pull.title,
          ":",
          "This pull request is an invalid format. see https://github.com/matsuri-tech/generate-release-notes-body-based-on-pull-requests/blob/main/src/isValidTitle.ts"
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
      }
      // other prefixes
      if (
        ["build", "ci", "perf", "test", "refactor", "docs"].includes(prefix)
      ) {
        sections.others.contents.unshift({
          scope: scope || prefix,
          description,
          ...identifier,
        });
      }
      // chore prefix
      if (["chore"].includes(prefix)) {
        sections.others.contents.unshift({
          scope,
          description,
          ...identifier,
        });
      }
    });

    console.log("generated source", ":", JSON.stringify(sections, null, 2));

    const getPrev = async () => {
      const pulls = await octokit.rest.pulls.list({
        ...context.repo,
        state: "closed",
        per_page: 100,
      });

      type PR = (typeof pulls.data)[number];
      type MergedPR = PR & { merged_at: string };
      const prev = pulls.data
        .filter((pull): pull is MergedPR => {
          return pull.merged_at !== null;
        })
        .sort((prev, next) => {
          return Number(next.merged_at) - Number(prev.merged_at);
        })
        .find((pull) => {
          return pull.title.startsWith(RELEASE_PREFIX);
        });

      return prev;
    };

    const prev = await getPrev();

    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: mergeBody(
        context.payload.pull_request.body,
        [
          START_COMMENT_OUT,
          makeBody(sections),
          prev ? `**Prev**: [${prev.title}](${prev.html_url})` : null,
          END_COMMENT_OUT,
        ]
          .filter(Boolean)
          .join("\n\n")
      ),
    });
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
