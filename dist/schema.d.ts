/**
 * Schemas for `output_config.format`, cleaned before they leave.
 *
 * Anthropic's Structured Outputs accept only a subset of JSON Schema, and a
 * rejected schema does not fail loudly. The proxy answers the 400 by walking
 * down the fallback chain, so the caller gets another model's answer — a
 * slower, worse one — with no error anywhere. Three agents found this out
 * separately:
 *
 *   - LaPareditaAgent, 2026-09-04: `minimum`/`maximum` rejected, the vision
 *     verdict silently judged by `openai/gpt-4.1` instead
 *     (req_011CeiHt9PcYbV32QEL7uF9K). Fixed locally, detection only.
 *   - HealthAgent: the schema root must be an object; a bare list is rejected.
 *   - project-mission-control, 2026-09-18: a probability with `minimum: 0,
 *     maximum: 1` sent a day of decisions to the local 4B model
 *     (`ollama_chat/qwen3.5:4b`) without one log line naming Anthropic.
 *
 * Measured one keyword at a time against the API on 2026-09-18, fallbacks
 * disabled. Rejected: minimum, maximum, exclusiveMinimum, exclusiveMaximum,
 * multipleOf, maxItems, and minItems above 1. Accepted: integer, enum,
 * const, minLength, maxLength, pattern, format, minItems 0 or 1.
 *
 * Living here, once, means no fourth agent has to rediscover it.
 */
/** Keywords Anthropic rejects inside `output_config.format.schema`. */
export declare const UNSUPPORTED_SCHEMA_KEYWORDS: readonly string[];
/**
 * A copy of `schema` without the keywords Anthropic rejects, recursively.
 * `minItems` survives only as 0 or 1. Field names under `properties` are left
 * alone: a field called "minimum" is data, not a keyword.
 *
 * Range limits become the caller's job to enforce in code — which is where
 * they had to be anyway, since a fallback model may ignore the schema.
 */
export declare function toAnthropicSchema(schema: Record<string, unknown>): Record<string, unknown>;
/**
 * Throws when the schema root is not an object. Unlike the keywords above,
 * this cannot be fixed silently — wrapping a list changes the shape of the
 * answer the caller parses — so the mistake surfaces at the call site, where
 * it costs one edit, instead of as a quiet fallback in production.
 */
export declare function assertObjectRoot(schema: Record<string, unknown>): void;
/** The `output_config` actually sent: format schema cleaned, everything else untouched. */
export declare function prepareOutputConfig<T extends {
    format?: {
        type: string;
        schema: Record<string, unknown>;
    };
}>(config: T): T;
//# sourceMappingURL=schema.d.ts.map