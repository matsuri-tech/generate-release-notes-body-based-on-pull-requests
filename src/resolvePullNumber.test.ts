import { resolvePullNumber } from "./resolvePullNumber.js";
import { test, expect, describe } from "vitest";

describe("resolvePullNumber", () => {
  test("uses payload pull_request.number when available", () => {
    expect(resolvePullNumber(42, "")).toBe(42);
  });

  test("payload takes precedence over PULL_NUMBER input", () => {
    expect(resolvePullNumber(42, "99")).toBe(42);
  });

  test("falls back to PULL_NUMBER input when payload is undefined", () => {
    expect(resolvePullNumber(undefined, "123")).toBe(123);
  });

  test("throws when both payload and input are unavailable", () => {
    expect(() => resolvePullNumber(undefined, "")).toThrow(
      "This action requires a pull_request event context or a valid PULL_NUMBER input.",
    );
  });

  test("throws when PULL_NUMBER input is not a valid number", () => {
    expect(() => resolvePullNumber(undefined, "abc")).toThrow(
      "This action requires a pull_request event context or a valid PULL_NUMBER input.",
    );
  });
});
