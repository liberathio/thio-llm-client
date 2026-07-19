import Anthropic from "@anthropic-ai/sdk";
let _client = null;
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
export function getClient() {
    if (_client)
        return _client;
    const baseURL = process.env.LITELLM_BASE_URL ?? "http://localhost:4000";
    const apiKey = process.env.LITELLM_API_KEY ?? process.env.LITELLM_MASTER_KEY;
    if (!apiKey) {
        throw new Error(`[@thio/llm-client] neither LITELLM_API_KEY (per-agent virtual key, preferred) nor ` +
            `LITELLM_MASTER_KEY is set. This package requires the LiteLLM proxy at ${baseURL}. ` +
            `Direct vendor calls (api.anthropic.com / api.openai.com) are forbidden — see ~/.claude/rules/common/llm-routing.md.`);
    }
    _client = new Anthropic({ apiKey, baseURL });
    return _client;
}
/** Test-only: reset the singleton so a test can swap the env. */
export function resetClientForTests() {
    _client = null;
}
//# sourceMappingURL=client.js.map