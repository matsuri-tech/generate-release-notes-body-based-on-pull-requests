import { isValidTitle } from "./isValidTitle";

const data = [
  {
    input: "feat(scope): description",
    output: true
  },
  {
    input: "feat(scope):           description",
    output: true
  },
  {
    input: "feat(scope):                description",
    output: true
  },
  {
    input: "feat: description",
    output: true
  },
  {
    input: "foat: description",
    output: false
  },
  {
    input: "feat:",
    output: false
  }
  ,
  {
    input: ":description",
    output: false
  }
];

data.forEach(({ input, output }) => {
  test(`case: ${input}`, () => {
    expect(isValidTitle(input)).toStrictEqual(output);
  });
});