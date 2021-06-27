import { isValidTitle } from "./isValidTitle";

export const validate = (
  current: Pull,
  target: MergedPull,
  { releasePrefix }: { releasePrefix: string }
) => {
  if (current.merged_at) {
    if (new Date(current.merged_at) < new Date(target.merged_at)) {
      return {
        error: {
          type: "MERGED_PULL_AFTER" as const,
          message:
            "This is a pull request merged after the current release pull request.",
          continuous: true,
        },
      };
    }
  }
  if (
    current.title !== target.title ||
    current.merged_at !== target.merged_at
  ) {
    if (target.title.startsWith(releasePrefix)) {
      return {
        error: {
          type: "PREVIOUS_RELEASE_PULL" as const,
          message:
            "This is the last release pull request merged before the current release pull request.",
          continuous: false,
        },
      };
    }
  }
  if (isValidTitle(target.title)) {
    return {
      error: {
        type: "INVALID_TITLE_FORMAT" as const,
        message:
          "This pull request is an invalid format. see https://github.com/matsuri-tech/generate-release-notes-body-based-on-pull-requests/blob/main/src/isValidTitle.ts",
        continuous: true,
      },
    };
  }
  return {};
};
