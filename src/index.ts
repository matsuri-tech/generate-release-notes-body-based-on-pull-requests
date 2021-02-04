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

    const pull = await octokit.pulls.get({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
    });

    const RELEASE_PREFIX = core.getInput("RELEASE_PREFIX");

    if(isValidTitle(pull.data.title) === false){
      core.warning(
        "The title of this PR does not follow the conventional format."
      );
      return;
    }

    if (RELEASE_PREFIX !== parseTitle(pull.data.title).prefix) {
      core.warning(
        "This title prefix does not match the specified release prefix."
      );
      return;
    }

    const pulls = await octokit.pulls.list({
      ...context.repo,
      state: "closed",
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

    pulls.data.some((pull) => {
      if (isValidTitle(pull.title) === false) return false;
      const { prefix, scope, description } = parseTitle(pull.title);

      // Use the pull requests up to the latest release pull request.
      if (RELEASE_PREFIX === prefix) {
        return true;
      }
      // breaking changes
      const breakings = pull.body?.match(/^BREAKING CHANGE.*/gm);

      if (breakings) {
        breakings.filter(isValidTitle).map((breaking) => {
          const { description } = parseTitle(breaking);
          sections.breakings.contents.unshift({ description });
        });
      }
      // main prefixes
      if (["feat", "fix"].includes(prefix)) {
        sections[prefix].contents.unshift({ scope, description });
      }
      // other prefixes
      if (
        ["build", "ci", "perf", "test", "refactor", "docs"].includes(prefix)
      ) {
        sections.others.contents.unshift({
          scope: scope || prefix,
          description,
        });
      }
      // chore prefix
      if (["chore"].includes(prefix)) {
        sections.others.contents.unshift({ scope, description });
      }
    });

    await octokit.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: mergeBody(
        context.payload.pull_request.body || "",
        makeBody(sections)
      ),
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
