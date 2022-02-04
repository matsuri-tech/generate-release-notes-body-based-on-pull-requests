export const escapeHtmlTagsReplacer = (substring: string) => {
  switch (substring) {
    case "<": {
      return "&lt;";
    }
    case ">": {
      return "&gt;";
    }
    default: {
      throw new Error("unexpected substring");
    }
  }
};

export const escapeHtmlTags = (text: string) => {
  return text.replace(/[<>]/g, escapeHtmlTagsReplacer);
};
