import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../types.js";

/**
 * v0.2.0 contract: when tools are passed AND caching is enabled, the
 * wrapper auto-tags the LAST tool with cache_control. This mirrors
 * ThioBot's manual pattern (core/claude/toolUtils.ts) but centralized.
 *
 * We test the helper indirectly through the same code path complete.ts
 * uses — by re-importing the unexported helper would be cleaner, but
 * keeping the export surface minimal is preferred. So we test the
 * higher-level invariant: with N tools, only the Nth is tagged.
 */

import { wrapToolsForTest } from "../complete-internals.js";

describe("tools cache_control", () => {
  const tools: ToolDefinition[] = [
    { name: "search", description: "search the web", input_schema: { type: "object" } },
    { name: "fetch", description: "fetch a URL", input_schema: { type: "object" } },
    { name: "remember", description: "save a fact", input_schema: { type: "object" } },
  ];

  it("tags only the last tool when caching is enabled", () => {
    const out = wrapToolsForTest(tools, "5m", true);
    expect(out[0]).not.toHaveProperty("cache_control");
    expect(out[1]).not.toHaveProperty("cache_control");
    expect((out[2] as { cache_control?: unknown }).cache_control).toEqual({
      type: "ephemeral",
      ttl: "5m",
    });
  });

  it("respects 1h ttl", () => {
    const out = wrapToolsForTest(tools, "1h", true);
    expect((out[2] as { cache_control?: { ttl?: string } }).cache_control?.ttl).toBe("1h");
  });

  it("does not tag anything when caching disabled", () => {
    const out = wrapToolsForTest(tools, "5m", false);
    for (const t of out) {
      expect(t).not.toHaveProperty("cache_control");
    }
  });

  it("does not mutate input", () => {
    const before = JSON.stringify(tools);
    wrapToolsForTest(tools, "5m", true);
    expect(JSON.stringify(tools)).toBe(before);
  });

  it("returns input unchanged on empty array", () => {
    expect(wrapToolsForTest([], "5m", true)).toEqual([]);
  });
});
