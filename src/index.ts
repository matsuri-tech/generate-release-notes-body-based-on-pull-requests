import * as core from "@actions/core";
import * as github from "@actions/github";
import { parseTitle } from "./parseTitle.js";
import { makeBody } from "./makeBody.js";
import { mergeBody } from "./mergeBody.js";
import { isValidTitle } from "./isValidTitle.js";
import { END_COMMENT_OUT, START_COMMENT_OUT } from "./constants.js";
import { groupPullsBySemantic } from "./groupPullsBySemantic.js";
import { makeAutoReleasedSection } from "./makeAutoReleasedSection.js";
import {
  getChangedFilesForPR,
  getChangedFilesForPRsBatch,
  matchesPathFilter,
} from "./pathFilter.js";

const getAllCommits = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repository: {
    owner: string;
    repo: string;
  },
  pullNumber: number,
) => {
  const commits = [];
  let hasMorePages = true;
  let page = 1;

  while (hasMorePages) {
    const data = await octokit.rest.pulls.listCommits({
      ...repository,
      pull_number: pullNumber,
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
    const PATH_FILTER = core.getInput("PATH_FILTER");

    const pathFilters = PATH_FILTER
      ? PATH_FILTER.split(",")
          .map((filter) => filter.trim())
          .filter(Boolean)
      : [];

    if (pathFilters.length > 0) {
      core.info(`Path filters enabled: ${pathFilters.join(", ")}`);
    }

    if (RELEASE_PREFIX !== currrentTitle.prefix) {
      if (isValidTitle(current.data.title) === false) {
        throw new Error("This pull request is an invalid format.");
      }

      core.warning(
        `This title prefix does not match the specified release prefix "${RELEASE_PREFIX}".`,
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
        return Date.parse(next.merged_at!) - Date.parse(prev.merged_at!);
      });
    const releasePulls = mergedPulls.filter((pull) => {
      return pull.title.startsWith(RELEASE_PREFIX);
    });
    const prevPull = releasePulls[0];
    const prevPullIndex = prevPull ? mergedPulls.indexOf(prevPull) : -1;

    // 前回 AUTO_MERGE_ACTOR 以外がマージしたリリースPRまでの、
    // AUTO_MERGE_ACTOR によって自動マージされたリリースPRを抽出する
    // 空文字が指定されている場合はこの機能を無効化する
    const AUTO_MERGE_ACTOR = core.getInput("AUTO_MERGE_ACTOR");
    const autoReleasedPullUrls: string[] = [];
    if (AUTO_MERGE_ACTOR) {
      for (const releasePull of releasePulls) {
        const { data } = await octokit.rest.pulls.get({
          ...context.repo,
          pull_number: releasePull.number,
        });
        if (data.merged_by?.login !== AUTO_MERGE_ACTOR) {
          break;
        }
        autoReleasedPullUrls.push(data.html_url);
      }
    }

    const targetPulls = [];

    if (currrentTitle.description.startsWith("v")) {
      // tagによる管理がされている場合:
      // ex.) Release Note: v2.0.2
      // 前回のRelease NoteまでにマージされたPRを対象にする
      const candidatePulls = mergedPulls.slice(0, prevPullIndex);

      if (pathFilters.length > 0) {
        // Filter PRs by path changes using efficient batch fetching
        core.info(`Filtering ${candidatePulls.length} PRs by path changes...`);
        const pullNumbers = candidatePulls.map((pull) => pull.number);
        const pullFilesMap = await getChangedFilesForPRsBatch(
          octokit,
          context.repo,
          pullNumbers,
        );

        const filteredPulls = candidatePulls.filter((pull) => {
          const changedFiles = pullFilesMap[pull.number] || [];
          const matches = matchesPathFilter(changedFiles, pathFilters);

          return matches;
        });

        core.info(`Filtered down to ${filteredPulls.length} PRs`);
        targetPulls.push(...filteredPulls);
      } else {
        targetPulls.push(...candidatePulls);
      }
    } else {
      // ブランチによる管理がされている場合：
      // ex.) Release Note: 2025-02-01
      // 今回のRelease Noteに含まれてるコミットから対象となるPRを特定する

      const commits = await getAllCommits(
        octokit,
        context.repo,
        current.data.number,
      );

      // 各コミットが属するPRをGitHub APIで解決する。
      // コミットメッセージを解析しないため merge / squash / rebase の
      // いずれの形式でも正しく取得でき、メッセージ中のissue参照
      // (例: "fix: ... (#123)" の #123 がissueの場合)を誤ってPRとして
      // 拾うこともない。1つのPRは複数コミットに紐づくため番号で重複排除する。
      type AssociatedPull = Awaited<
        ReturnType<
          typeof octokit.rest.repos.listPullRequestsAssociatedWithCommit
        >
      >["data"][number];

      const associatedPullsPerCommit = await Promise.all(
        commits.map(async (commit) => {
          const { data } =
            await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
              ...context.repo,
              commit_sha: commit.sha,
            });
          return data;
        }),
      );

      const pullsByNumber = new Map<number, AssociatedPull>();
      for (const associatedPulls of associatedPullsPerCommit) {
        for (const pull of associatedPulls) {
          // リリースノートにはマージ済みPRのみを対象とする
          if (pull.merged_at && !pullsByNumber.has(pull.number)) {
            pullsByNumber.set(pull.number, pull);
          }
        }
      }

      const filterdCommits = Array.from(pullsByNumber.values());

      if (pathFilters.length > 0) {
        // Filter PRs by path changes using efficient batch fetching
        core.info(`Filtering ${filterdCommits.length} PRs by path changes...`);
        const pullNumbers = filterdCommits.map((pull) => pull.number);
        const pullFilesMap = await getChangedFilesForPRsBatch(
          octokit,
          context.repo,
          pullNumbers,
        );

        const pathFilteredPulls = filterdCommits.filter((pull) => {
          const changedFiles = pullFilesMap[pull.number] || [];
          const matches = matchesPathFilter(changedFiles, pathFilters);

          return matches;
        });

        core.info(`Filtered down to ${pathFilteredPulls.length} PRs`);
        targetPulls.push(...pathFilteredPulls);
      } else {
        targetPulls.push(...filterdCommits);
      }
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
          makeAutoReleasedSection(autoReleasedPullUrls),
          END_COMMENT_OUT,
        ]
          .filter(Boolean)
          .join("\n\n"),
      ),
    });
  } catch (error: any) {
    core.setFailed(error.message);
  }
}

run();
