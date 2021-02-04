export const isValidTitle = (title: string): boolean => {
  return /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z -_\/]+\))?: [\w ]+$/.test(title);
};