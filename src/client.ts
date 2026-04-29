import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

/**
 * Build / return the singleton Anthropic-compatible client pointed at the
 * local LiteLLM proxy. Reads:
 *
 *   LITELLM_BASE_URL    — defaults to http://localhost:4000
 *   LITELLM_MASTER_KEY  — required; fail fast otherwise
 *
 * Why singleton: every agent in the ecosystem ended up creating its own
 * lazy-init wrapper. Now there's one. Also avoids reconnecting on every
 * call which the underlying SDK doesn't pool well.
 *
 * Tests can call `resetClientForTests()` to drop the singleton.
 */
export function getClient(): Anthropic {
  if (_client) return _client;

  const baseURL = process.env.LITELLM_BASE_URL ?? "http://localhost:4000";
  const apiKey = process.env.LITELLM_MASTER_KEY;
  if (!apiKey) {
    throw new Error(
      `[@thio/llm-client] LITELLM_MASTER_KEY not set. This package requires the LiteLLM proxy at ${baseURL}. ` +
        `Direct vendor calls (api.anthropic.com / api.openai.com) are forbidden — see ~/.claude/rules/common/llm-routing.md.`,
    );
  }

  _client = new Anthropic({ apiKey, baseURL });
  return _client;
}

/** Test-only: reset the singleton so a test can swap the env. */
export function resetClientForTests(): void {
  _client = null;
}
