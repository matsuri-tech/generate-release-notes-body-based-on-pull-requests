export const makeAutoReleasedSection = (urls: string[]) => {
  if (urls.length === 0) {
    return null;
  }
  return [
    "## 自動リリースされたPR一覧",
    urls.map((url) => `- ${url}`).join("\n"),
  ].join("\n\n");
};
