/**
 * Anthropic prompt caching helpers.
 *
 * Two strategies, picked at the call site via `cacheStrategy`:
 *
 *   "system"        Default. The SYSTEM prompt is sent as a single text
 *                   block tagged ephemeral. Best for one-shot calls
 *                   (today-pick, summarize, classify) where there's a
 *                   stable static system prompt.
 *
 *   "system_and_3"  Ported verbatim from hermes-agent's
 *                   agent/prompt_caching.py — 4 cache breakpoints (the
 *                   Anthropic max): system + last 3 non-system messages
 *                   as a rolling window. Best for chat-like agents
 *                   (Telegram bots, coach sessions). Anthropic-specific.
 *
 *   "none"          No cache_control injected. Use for one-off calls
 *                   where the prompt is unique per call (rare).
 *
 * Anthropic discounts ~90% on input tokens that match a previously-cached
 * prefix (5-min TTL by default; 1h available). So even a single repeated
 * system prompt across ~10 calls/min already pays back.
 */
export interface CacheControlMarker {
    type: "ephemeral";
    ttl?: "5m" | "1h";
}
export interface SystemBlock {
    type: "text";
    text: string;
    cache_control?: CacheControlMarker;
}
export interface AnthropicMessage {
    role: "user" | "assistant";
    content: string | Array<{
        type: "text";
        text: string;
        cache_control?: CacheControlMarker;
    }>;
}
/**
 * Wrap a SYSTEM string into the cached-block shape Anthropic expects.
 */
export declare function cachedSystem(text: string, ttl?: "5m" | "1h"): SystemBlock[];
/**
 * Apply system + 3 rolling cache markers to a multi-turn message list.
 * Returns a NEW array — does not mutate the input.
 *
 * Logic (matching hermes-agent's reference impl):
 *   1. Iterate non-system messages.
 *   2. Mark cache_control on the last 3 of them.
 *   3. The system itself is cached separately via the `system` field.
 */
export declare function applySystemAnd3(messages: AnthropicMessage[], ttl?: "5m" | "1h"): AnthropicMessage[];
//# sourceMappingURL=cache.d.ts.map