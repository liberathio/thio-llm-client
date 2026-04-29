import { getClient } from "./client.js";
import { assertAlias } from "./aliases.js";
import { cachedSystem, applySystemAnd3 } from "./cache.js";
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
export async function complete(input) {
    validate(input);
    const client = getClient();
    const cacheStrategy = input.cacheStrategy ?? "system";
    const ttl = input.cacheTtl ?? "5m";
    const messages = "user" in input && input.user
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
    const response = await client.messages.create({
        model: input.model,
        max_tokens: input.maxTokens ?? 1024,
        temperature: input.temperature,
        ...(systemField ? { system: systemField } : {}),
        messages: finalMessages,
        metadata: buildMetadata(input),
    });
    const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b.type === "text" ? b.text ?? "" : ""))
        .join("\n")
        .trim();
    return {
        text,
        model: response.model,
        usage: {
            input_tokens: response.usage.input_tokens,
            output_tokens: response.usage.output_tokens,
            cache_creation_input_tokens: response.usage
                .cache_creation_input_tokens,
            cache_read_input_tokens: response.usage
                .cache_read_input_tokens,
        },
    };
}
export function validate(input) {
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
export function buildMetadata(input) {
    const md = {
        agent: input.agent,
        purpose: input.purpose,
        env: input.env ?? (process.env.NODE_ENV === "production" ? "production" : "development"),
    };
    if (input.userId)
        md.user_id = input.userId;
    return md;
}
//# sourceMappingURL=complete.js.map