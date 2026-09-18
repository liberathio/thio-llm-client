import { prepareOutputConfig } from "./schema.js";
import { getClient } from "./client.js";
import { applySystemAnd3, cachedSystem, type AnthropicMessage } from "./cache.js";
import { validate, buildMetadata } from "./complete.js";
import type { CompleteFlat, StreamEvent } from "./types.js";

/**
 * Streaming completion. Yields one event per token chunk (`type:"delta"`),
 * then a single `type:"done"` with usage + model. Errors surface as
 * `type:"error"` and end the stream.
 *
 * Same validation/caching/tagging contract as `complete()`.
 *
 * Usage:
 *
 *   for await (const ev of completeStream({...})) {
 *     if (ev.type === "delta") process.stdout.write(ev.text);
 *     else if (ev.type === "done") console.log("\nusage:", ev.output.usage);
 *   }
 */
export async function* completeStream(input: CompleteFlat): AsyncGenerator<StreamEvent> {
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

  let assembled = "";
  try {
    const stream = await client.messages.stream({
      model: input.model,
      max_tokens: input.maxTokens ?? 1024,
      temperature: input.temperature,
      ...(systemField ? { system: systemField as never } : {}),
      ...(input.outputConfig ? { output_config: prepareOutputConfig(input.outputConfig) as never } : {}),
      messages: finalMessages as never,
      metadata: buildMetadata(input),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        const t = event.delta.text;
        assembled += t;
        yield { type: "delta", text: t };
      }
    }

    const final = await stream.finalMessage();
    yield {
      type: "done",
      output: {
        text: assembled,
        model: final.model,
        usage: {
          input_tokens: final.usage.input_tokens,
          output_tokens: final.usage.output_tokens,
          cache_creation_input_tokens: (final.usage as { cache_creation_input_tokens?: number })
            .cache_creation_input_tokens,
          cache_read_input_tokens: (final.usage as { cache_read_input_tokens?: number })
            .cache_read_input_tokens,
        },
      },
    };
  } catch (err) {
    yield { type: "error", error: (err as Error).message };
  }
}
