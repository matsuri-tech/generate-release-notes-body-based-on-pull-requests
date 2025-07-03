import * as github from "@actions/github";

export const getChangedFilesForPR = async (
  octokit: ReturnType<typeof github.getOctokit>,
  repository: {
    owner: string;
    repo: string;
  },
  pull_number: number
): Promise<string[]> => {
  const files = [];
  let hasMorePages = true;
  let page = 1;

  while (hasMorePages) {
    const data = await octokit.rest.pulls.listFiles({
      ...repository,
      pull_number,
      page,
      per_page: 100,
    });

    files.push(...data.data.map(file => file.filename));

    hasMorePages = data.data.length === 100;
    page++;
  }

  return files;
};

export const matchesPathFilter = (files: string[], pathFilters: string[]): boolean => {
  if (pathFilters.length === 0) {
    return true; // No filter specified, include all
  }

  return files.some(file => 
    pathFilters.some(filter => 
      file.startsWith(filter.trim())
    )
  );
};