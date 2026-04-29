/**
 * Internal helpers exported for testing. NOT part of the public API —
 * callers should import from "@thio/llm-client" / "./index.js" only.
 */
/**
 * Same logic as the private wrapToolsWithCache() in complete.ts. Kept in
 * a separate module so __tests__/tools.test.ts can verify the invariant
 * without exposing it on the public package surface.
 */
export function wrapToolsForTest(tools, ttl, enable) {
    if (!enable || tools.length === 0)
        return tools.slice();
    return tools.map((tool, idx) => {
        if (idx !== tools.length - 1)
            return tool;
        return { ...tool, cache_control: { type: "ephemeral", ttl } };
    });
}
//# sourceMappingURL=complete-internals.js.map