import * as core from "@actions/core";
import * as github from "@actions/github";
import { parseTitle } from "./parseTitle";
import { makeBody } from "./makeBody";
import { mergeBody } from "./mergeBody";
import { isValidTitle } from "./isValidTitle";

async function run() {
  try {
    const GITHUB_TOKEN = core.getInput("GITHUB_TOKEN");

    const octokit = github.getOctokit(GITHUB_TOKEN);

    const context = github.context;

    if (context.payload.pull_request === undefined) {
      throw new Error("This action only runs for pull request.");
    }

    const current = await octokit.pulls.get({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
    });

    const RELEASE_PREFIX = core.getInput("RELEASE_PREFIX");

    if (RELEASE_PREFIX !== parseTitle(current.data.title).prefix) {
      core.warning(
        `This title prefix does not match the specified release prefix "${RELEASE_PREFIX}".`
      );
      return;
    }

    const pulls = await octokit.pulls.list({
      ...context.repo,
      state: "closed",
      per_page: 100,
    });

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

    type PR = typeof pulls.data[number];
    type MergedPR = PR & { merged_at: string };

    const isMerged = (pull: PR): pull is MergedPR => {
      return !!pull.merged_at;
    };

    pulls.data
      .filter(isMerged)
      .sort((prev, next) => {
        const p = new Date(prev.merged_at);
        const n = new Date(next.merged_at);
        return p < n ? 1 : -1;
      })
      .some((pull) => {
        console.log(pull.title);

        if (
          current.data.merged_at &&
          new Date(current.data.merged_at) < new Date(pull.merged_at)
        ) {
          console.log(
            pull.title,
            ":",
            "This is a pull request merged after the current release pull request."
          );
          return false;
        }

        // Use the pull requests up to the latest release pull request.
        if (
          current.data.title !== pull.title &&
          current.data.merged_at !== pull.merged_at &&
          pull.title.startsWith(RELEASE_PREFIX)
        ) {
          console.log(
            pull.title,
            ":",
            "This is the last release pull request merged before the current release pull request."
          );
          return true;
        }

        if (isValidTitle(pull.title) === false) {
          console.log(
            pull.title,
            ":",
            "This pull request is an invalid format. see https://github.com/matsuri-tech/generate-release-notes-body-based-on-pull-requests/blob/main/src/isValidTitle.ts"
          );
          return false;
        }
        const { prefix, scope, description } = parseTitle(pull.title);

        console.log(
          pull.title,
          ":",
          "parsed",
          "=>",
          prefix,
          scope,
          description
        );

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

    await octokit.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: mergeBody(context.payload.pull_request.body, makeBody(sections)),
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
