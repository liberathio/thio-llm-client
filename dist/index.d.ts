/**
 * @thio/llm-client
 *
 * Shared LLM client for Thio's agent ecosystem (PMC, ThioBot, hermes-agent,
 * LaPareditaAgent, inner-coach, future agents). Wraps the Anthropic SDK with:
 *
 *   - Mandatory tagging (`agent` + `purpose`) — forces cost attribution.
 *   - Alias-only model selection — blocks raw vendor IDs that go stale.
 *   - Anthropic's `system_and_3` prompt-caching strategy (ported from
 *     hermes-agent/agent/prompt_caching.py — best in the ecosystem).
 *   - Single client init pointed at the local LiteLLM proxy. No direct
 *     vendor calls allowed.
 *
 * Quickstart:
 *
 *   import { complete, completeStream, getClient } from "@thio/llm-client";
 *
 *   const out = await complete({
 *     agent: "pmc",
 *     purpose: "today-pick",
 *     model: "claude-sonnet",
 *     system: "You are…",
 *     user: "Pick today's project",
 *     maxTokens: 400,
 *   });
 *
 *   for await (const ev of completeStream({...})) { ... }
 *
 * Why a shared package: as of the 2026-04 cost audit, every agent in the
 * ecosystem reinvented its own client wrapper, prompt-caching strategy,
 * and tagging discipline. The same bugs (untagged calls, raw model IDs,
 * forgotten cache_control) kept surfacing across projects. This package
 * makes the safe path the only path. See README.md for migration guides.
 */
export { getClient, resetClientForTests } from "./client.js";
export { complete } from "./complete.js";
export { completeStream } from "./stream.js";
export { cachedSystem, applySystemAnd3 } from "./cache.js";
export type { CompleteInput, CompleteOutput, StreamEvent, ModelAlias, CacheStrategy, Tag, ToolDefinition, OutputConfig, ToolUseBlock, TextBlock, ContentBlock, } from "./types.js";
export { ALLOWED_ALIASES, isAlias, assertAlias } from "./aliases.js";
//# sourceMappingURL=index.d.ts.map