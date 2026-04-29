import type { CompleteFlat, CompleteOutput } from "./types.js";
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
export declare function complete(input: CompleteFlat): Promise<CompleteOutput>;
export declare function validate(input: CompleteFlat): void;
export declare function buildMetadata(input: CompleteFlat): Record<string, string>;
//# sourceMappingURL=complete.d.ts.map