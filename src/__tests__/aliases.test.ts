import { describe, expect, it } from "vitest";
import { ALLOWED_ALIASES, isAlias, assertAlias } from "../aliases.js";

describe("aliases", () => {
  it("accepts every alias in ALLOWED_ALIASES", () => {
    for (const a of ALLOWED_ALIASES) {
      expect(isAlias(a)).toBe(true);
      expect(() => assertAlias(a)).not.toThrow();
    }
  });

  it("rejects raw vendor IDs with a redirect message", () => {
    expect(() => assertAlias("claude-sonnet-4-6-20251001")).toThrowError(/Raw vendor ID/);
    expect(() => assertAlias("gpt-4o-mini")).toThrowError(/Raw vendor ID/);
    expect(() => assertAlias("gemini-1.5-flash")).toThrowError(/Raw vendor ID/);
  });

  it("rejects unknown strings with the alias list", () => {
    expect(() => assertAlias("magic-model-9000")).toThrowError(/Unknown model/);
  });
});
