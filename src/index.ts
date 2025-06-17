import * as core from "@actions/core";
import * as github from "@actions/github";
import { parseTitle } from "./parseTitle";
import { makeBody } from "./makeBody";
import { mergeBody } from "./mergeBody";
import { isValidTitle } from "./isValidTitle";
import { END_COMMENT_OUT, START_COMMENT_OUT } from "./constants";
import { groupPullsBySemantic } from "./groupPullsBySemantic";

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
  let page = 1;

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
    const currrentTitle = parseTitle(current.data.title);

    const RELEASE_PREFIX = core.getInput("RELEASE_PREFIX");
    const RELEASE_LABEL = core.getInput("RELEASE_LABEL");

    if (RELEASE_PREFIX !== currrentTitle.prefix) {
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

    const mergedPulls = (
      await octokit.rest.pulls.list({
        ...context.repo,
        state: "closed",
        per_page: 100,
      })
    ).data
      .filter((pull) => {
        return !!pull.merged_at;
      })
      .sort((prev, next) => {
        return Number(next.merged_at) - Number(prev.merged_at);
      });
    const prevPullIndex = mergedPulls.findIndex((pull) => {
      return pull.title.startsWith(RELEASE_PREFIX);
    });
    const prevPull = mergedPulls[prevPullIndex];

    const targetPulls = [];

    if (currrentTitle.description.startsWith("v")) {
      // tagによる管理がされている場合:
      // ex.) Release Note: v2.0.2
      // 前回のRelease NoteまでにマージされたPRを対象にする
      targetPulls.push(...mergedPulls.slice(0, prevPullIndex));
    } else {
      // ブランチによる管理がされている場合：
      // ex.) Release Note: 2025-02-01
      // 今回のRelease Noteに含まれてるコミットから対象となるPRを特定する

      const commits = await getAllCommits(
        octokit,
        context.repo,
        current.data.number
      );

      const filterdCommits = await Promise.all(
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

      targetPulls.push(...filterdCommits);
    }

    const sections = groupPullsBySemantic(targetPulls);

    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: context.payload.pull_request.number,
      body: mergeBody(
        context.payload.pull_request.body,
        [
          START_COMMENT_OUT,
          makeBody(sections),
          prevPull
            ? `**Prev**: [${prevPull.title}](${prevPull.html_url})`
            : null,
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
