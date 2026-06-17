/**
 * コミットメッセージからPR番号を抽出する。
 *
 * GitHubのマージ方式によってコミットメッセージの形式が異なるため、
 * 代表的な3つの形式に対応する。
 *
 * - merge commit:   "Merge pull request #123 from owner/branch"
 * - squash merge:   "<subject> (#123)"
 * - rebase merge:   "<subject> (#123)"  (squashと同じ形式)
 *
 * 抽出できない場合は undefined を返す。
 */
export const extractPullNumber = (message: string): number | undefined => {
  const firstLine = message.split("\n")[0];

  // merge commit: "Merge pull request #123 from ..."
  const mergeMatch = firstLine.match(/^Merge pull request #(\d+)\b/);
  if (mergeMatch) {
    return parseInt(mergeMatch[1], 10);
  }

  // squash / rebase merge: 件名末尾の "(#123)"
  const squashMatch = firstLine.match(/\(#(\d+)\)\s*$/);
  if (squashMatch) {
    return parseInt(squashMatch[1], 10);
  }

  return undefined;
};
