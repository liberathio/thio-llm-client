import { prepareOutputConfig } from "./schema.js";
import { getClient } from "./client.js";
import { assertAlias } from "./aliases.js";
import { cachedSystem, applySystemAnd3, type AnthropicMessage } from "./cache.js";
import type { CompleteFlat, CompleteOutput, ContentBlock } from "./types.js";

/**
 * Single-shot or multi-turn completion. Always non-streaming. Use
 * `completeStream()` for streaming.
 *
 * Enforces:
 *   - alias-only models (raw vendor IDs throw)
 *   - mandatory `agent` + `purpose` tags (so cost is attributable)
 *   - prompt caching strategy (default "system")
 *
 * Tags travel as Anthropic `metadata` (which LiteLLM mirrors into
 * Langfuse + spend_per_tag).
 */
export async function complete(input: CompleteFlat): Promise<CompleteOutput> {
  validate(input);
  const client = getClient();

  const cacheStrategy = input.cacheStrategy ?? "system";
  const ttl = input.cacheTtl ?? "5m";

  const messages: AnthropicMessage[] = "user" in input && input.user
    ? [{ role: "user", content: input.user }]
    : (input.messages ?? []);

  const finalMessages = cacheStrategy === "system_and_3"
    ? applySystemAnd3(messages, ttl)
    : messages;

  const systemField = input.system
    ? cacheStrategy === "none"
      ? input.system
      : cachedSystem(input.system, ttl)
    : undefined;

  // Tools support (v0.2.0+). Anthropic's tools API also benefits from
  // prompt caching when the LAST tool gets cache_control — so we wrap
  // them automatically for the caller.
  const toolsField = input.tools && input.tools.length > 0
    ? wrapToolsWithCache(input.tools, ttl, cacheStrategy !== "none")
    : undefined;

  const response = await client.messages.create({
    model: input.model,
    max_tokens: input.maxTokens ?? 1024,
    temperature: input.temperature,
    ...(systemField ? { system: systemField as never } : {}),
    ...(toolsField ? { tools: toolsField as never } : {}),
    ...(input.outputConfig ? { output_config: prepareOutputConfig(input.outputConfig) as never } : {}),
    messages: finalMessages as never,
    metadata: buildMetadata(input),
  });

  const text = response.content
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { type: string; text?: string }) => (b.type === "text" ? b.text ?? "" : ""))
    .join("\n")
    .trim();

  return {
    text,
    model: response.model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: (response.usage as { cache_creation_input_tokens?: number })
        .cache_creation_input_tokens,
      cache_read_input_tokens: (response.usage as { cache_read_input_tokens?: number })
        .cache_read_input_tokens,
    },
    stopReason: (response as { stop_reason?: string }).stop_reason,
    content: response.content as ContentBlock[],
  };
}

/**
 * Apply cache_control to the LAST tool when caching is enabled. Anthropic
 * uses a single breakpoint at the end of the tools array to cache the
 * entire prefix (system + tools), so tagging the last tool is enough.
 *
 * Pattern adopted from ThioBot's core/claude/toolUtils.ts which has
 * been doing this manually — now centralized.
 */
function wrapToolsWithCache(
  tools: NonNullable<CompleteFlat["tools"]>,
  ttl: "5m" | "1h",
  enable: boolean,
) {
  if (!enable || tools.length === 0) return tools;
  return tools.map((tool, idx) => {
    if (idx !== tools.length - 1) return tool;
    return { ...tool, cache_control: { type: "ephemeral" as const, ttl } };
  });
}

export function validate(input: CompleteFlat): void {
  assertAlias(input.model);
  if (!input.agent || input.agent.length < 2) {
    throw new Error(`[@thio/llm-client] missing or invalid \`agent\` tag (got ${JSON.stringify(input.agent)}). Every call must be tagged so cost is attributable.`);
  }
  if (!input.purpose || input.purpose.length < 2) {
    throw new Error(`[@thio/llm-client] missing or invalid \`purpose\` tag (got ${JSON.stringify(input.purpose)}). Every call must be tagged so cost is attributable.`);
  }
  // XOR: one of user / messages must be provided.
  const hasUser = "user" in input && typeof input.user === "string" && input.user.length > 0;
  const hasMessages = "messages" in input && Array.isArray(input.messages) && input.messages.length > 0;
  if (hasUser === hasMessages) {
    throw new Error(`[@thio/llm-client] provide exactly one of \`user\` (single-shot) or \`messages\` (multi-turn).`);
  }
}

/**
 * Normalize a tag value: LiteLLM stores request_tags as a JSON array and
 * downstream tooling splits on commas, so a comma or whitespace inside a
 * value silently fragments the tag. Collapse both to `-`.
 */
function tagValue(raw: string): string {
  return raw.trim().replace(/[,\s]+/g, "-");
}

export function buildMetadata(input: CompleteFlat): Record<string, string | string[]> {
  const env = input.env ?? (process.env.NODE_ENV === "production" ? "production" : "development");

  // Flat keys: consumed by Langfuse traces.
  const md: Record<string, string | string[]> = {
    agent: input.agent,
    purpose: input.purpose,
    env,
  };
  if (input.userId) md.user_id = input.userId;

  // `tags` array: the ONLY shape LiteLLM mirrors into LiteLLM_SpendLogs
  // .request_tags and /global/spend/tags. Flat keys above are dropped by
  // the spend tracker — verified against the live proxy 2026-07-29.
  // Without this the call is billed but unattributable.
  const tags = [
    `agent:${tagValue(input.agent)}`,
    `purpose:${tagValue(input.purpose)}`,
    `env:${tagValue(env)}`,
  ];
  if (input.userId) tags.push(`user:${tagValue(input.userId)}`);
  md.tags = tags;

  return md;
}
