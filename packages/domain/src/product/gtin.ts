/** GS1 mod-10: from the right, weights 3,1,3,1… on the digits before the check. */
export function hasValidGs1CheckDigit(code: string): boolean {
  if (!/^(?:\d{8}|\d{12,14})$/.test(code) || /^0+$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Compare the GS1 identity independently of the supplier's zero padding. */
export function gtinIdentity(code: string): string | undefined {
  return hasValidGs1CheckDigit(code) ? code.padStart(14, "0") : undefined;
}
