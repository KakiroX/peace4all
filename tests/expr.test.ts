import { describe, expect, it } from "vitest";
import { parseNumericAnswer } from "@/lib/expr";

describe("parseNumericAnswer", () => {
  const cases: [string, number][] = [
    ["3000", 3000],
    ["-2.5", -2.5],
    ["3.0e3", 3000],
    ["3.0E-3", 0.003],
    ["3.0×10^3", 3000],
    ["3.0 x 10^3", 3000],
    ["3*10**3", 3000],
    ["1.0×10⁵", 100000],
    ["7/9", 7 / 9],
    ["3e", 3 * Math.E],
    ["2pi", 2 * Math.PI],
    ["2π", 2 * Math.PI],
    ["sqrt(3)/2", Math.sqrt(3) / 2],
    ["√3", Math.sqrt(3)],
    ["-2^2", -4],
    ["2(1+1)", 4],
    ["100,000", 100000],
    ["100 000", 100000],
    ["0,5", 0.5],
    ["3000 N", 3000],
    ["36%", 36],
    ["10 rad s⁻¹", 10],
    ["9.97×10⁴ Pa", 99700],
    ["ln(e)", 1],
  ];
  for (const [input, expected] of cases) {
    it(`reads ${JSON.stringify(input)}`, () => {
      expect(parseNumericAnswer(input)).toBeCloseTo(expected, 9);
    });
  }

  it.each(["", "abc", "N", "()", "%"])("rejects %j", (input) => {
    expect(parseNumericAnswer(input)).toBeNull();
  });
});
