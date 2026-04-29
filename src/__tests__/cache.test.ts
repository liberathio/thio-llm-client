import { describe, expect, it } from "vitest";
import { cachedSystem, applySystemAnd3 } from "../cache.js";

describe("cachedSystem", () => {
  it("wraps a string in a single block with ephemeral cache", () => {
    const out = cachedSystem("you are X");
    expect(out).toEqual([
      { type: "text", text: "you are X", cache_control: { type: "ephemeral", ttl: "5m" } },
    ]);
  });

  it("respects 1h ttl", () => {
    const out = cachedSystem("hi", "1h");
    expect(out[0]?.cache_control?.ttl).toBe("1h");
  });
});

describe("applySystemAnd3", () => {
  it("returns input unchanged when empty", () => {
    expect(applySystemAnd3([])).toEqual([]);
  });

  it("marks the last 3 messages of a 5-message thread", () => {
    const msgs = [
      { role: "user" as const, content: "1" },
      { role: "assistant" as const, content: "2" },
      { role: "user" as const, content: "3" },
      { role: "assistant" as const, content: "4" },
      { role: "user" as const, content: "5" },
    ];
    const out = applySystemAnd3(msgs);
    // First two unchanged.
    expect(out[0]).toEqual(msgs[0]);
    expect(out[1]).toEqual(msgs[1]);
    // Last 3 wrapped.
    for (let i = 2; i < 5; i++) {
      const c = out[i]?.content;
      expect(Array.isArray(c)).toBe(true);
      if (Array.isArray(c)) {
        expect(c[0]?.cache_control).toEqual({ type: "ephemeral", ttl: "5m" });
      }
    }
  });

  it("preserves array content and tags only the last block", () => {
    const msgs = [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: "a" },
          { type: "text" as const, text: "b" },
        ],
      },
    ];
    const out = applySystemAnd3(msgs);
    const c = out[0]?.content;
    expect(Array.isArray(c)).toBe(true);
    if (Array.isArray(c)) {
      expect(c[0]?.cache_control).toBeUndefined();
      expect(c[1]?.cache_control).toEqual({ type: "ephemeral", ttl: "5m" });
    }
  });

  it("does not mutate input", () => {
    const msgs = [{ role: "user" as const, content: "hi" }];
    const out = applySystemAnd3(msgs);
    expect(msgs[0]?.content).toBe("hi");
    expect(out[0]?.content).not.toBe("hi");
  });
});
