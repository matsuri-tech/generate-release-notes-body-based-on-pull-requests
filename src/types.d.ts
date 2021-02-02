declare type Sections = Readonly<{
  [key: string]: {
    heading: string;
    contents: {
      scope?: string;
      description: string;
    }[];
  };
}>;
