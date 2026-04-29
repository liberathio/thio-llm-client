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
export declare function completeStream(input: CompleteFlat): AsyncGenerator<StreamEvent>;
//# sourceMappingURL=stream.d.ts.map