/**
 * Internal helpers exported for testing. NOT part of the public API —
 * callers should import from "@thio/llm-client" / "./index.js" only.
 */

import type { ToolDefinition } from "./types.js";

/**
 * Same logic as the private wrapToolsWithCache() in complete.ts. Kept in
 * a separate module so __tests__/tools.test.ts can verify the invariant
 * without exposing it on the public package surface.
 */
export function wrapToolsForTest(
  tools: ToolDefinition[],
  ttl: "5m" | "1h",
  enable: boolean,
): ToolDefinition[] {
  if (!enable || tools.length === 0) return tools.slice();
  return tools.map((tool, idx) => {
    if (idx !== tools.length - 1) return tool;
    return { ...tool, cache_control: { type: "ephemeral" as const, ttl } };
  });
}
