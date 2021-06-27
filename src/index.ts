import { generate } from "./generator";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { parse } from "./parser";
import { validate } from "./validator";

const isMergedPull = (pull: Pull): pull is MergedPull => {
  return !!pull.merged_at;
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

    if (current.data.title.startsWith(RELEASE_PREFIX) === false) {
      core.warning(
        `This title prefix does not match the specified release prefix "${RELEASE_PREFIX}".`
      );
      return;
    }

    const pulls: Pulls = await octokit.rest.pulls.list({
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

    let prev = undefined as MergedPull | undefined;

    pulls.data
      .filter(isMergedPull)
      .sort((prev, next) => {
        const p = new Date(prev.merged_at);
        const n = new Date(next.merged_at);
        return p < n ? 1 : -1;
      })
      .some((pull) => {
        const { error } = validate(current.data, pull, {
          releasePrefix: RELEASE_PREFIX,
        });

        if (error) {
          console.log(pull.title, ":", error.message);
          if (error.type === "PREVIOUS_RELEASE_PULL") {
            prev = pull;
          }
          return error.continuous === false;
        }

        const result = parse(pull);

        if (result.breakings) {
          result.breakings.map((breaking) => {
            sections.breakings.contents.unshift(breaking);
          });
        }
        if (result.prefixGroup) {
          sections[result.prefixGroup].contents.unshift(result);
        }
      });

    console.log("generated source", ":", JSON.stringify(sections, null, 2));

    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: generate(context.payload.pull_request.body, sections, prev),
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
