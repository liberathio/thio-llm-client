import type { ModelAlias } from "./types.js";
/**
 * Allowed LiteLLM model aliases. Single source of truth for what a caller
 * can pass as `model:`. Keep in sync with ~/LiteLLM/litellm_config.yaml.
 *
 * Why no raw IDs: Anthropic ships a new Sonnet every ~3 months. Each release
 * forces a code change in every agent that has the ID hardcoded. Aliases
 * decouple the call site from the vendor's release cadence.
 */
export declare const ALLOWED_ALIASES: ReadonlyArray<ModelAlias>;
export declare function isAlias(model: string): model is ModelAlias;
/**
 * Throws if the caller tried to use a raw vendor ID like
 * `claude-sonnet-4-6-20251001` instead of an alias.
 */
export declare function assertAlias(model: string): asserts model is ModelAlias;
//# sourceMappingURL=aliases.d.ts.map