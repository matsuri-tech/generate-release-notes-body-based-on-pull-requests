export function resolvePullNumber(
  payloadPullNumber: number | undefined,
  pullNumberInput: string,
): number {
  const pull_number =
    payloadPullNumber ??
    (pullNumberInput ? parseInt(pullNumberInput, 10) : undefined);
  if (pull_number === undefined || Number.isNaN(pull_number)) {
    throw new Error(
      "This action requires a pull_request event context or a valid PULL_NUMBER input.",
    );
  }
  return pull_number;
}
