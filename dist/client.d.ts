import Anthropic from "@anthropic-ai/sdk";
/**
 * Build / return the singleton Anthropic-compatible client pointed at the
 * local LiteLLM proxy. Reads:
 *
 *   LITELLM_BASE_URL    — defaults to http://localhost:4000
 *   LITELLM_API_KEY     — preferred: the agent's own virtual key (per-agent
 *                         budget cap + rpm limit + spend attribution)
 *   LITELLM_MASTER_KEY  — fallback for agents not yet migrated to virtual
 *                         keys; one of the two is required, fail fast otherwise
 *
 * Why singleton: every agent in the ecosystem ended up creating its own
 * lazy-init wrapper. Now there's one. Also avoids reconnecting on every
 * call which the underlying SDK doesn't pool well.
 *
 * Tests can call `resetClientForTests()` to drop the singleton.
 */
export declare function getClient(): Anthropic;
/** Test-only: reset the singleton so a test can swap the env. */
export declare function resetClientForTests(): void;
//# sourceMappingURL=client.d.ts.map