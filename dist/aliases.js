/**
 * Allowed LiteLLM model aliases. Single source of truth for what a caller
 * can pass as `model:`. Keep in sync with ~/LiteLLM/litellm_config.yaml.
 *
 * Why no raw IDs: Anthropic ships a new Sonnet every ~3 months. Each release
 * forces a code change in every agent that has the ID hardcoded. Aliases
 * decouple the call site from the vendor's release cadence.
 */
export const ALLOWED_ALIASES = [
    "best",
    "fast",
    "cheap",
    "code",
    "smart",
    "ultra",
    "claude-sonnet",
    "claude-haiku",
    "claude-opus",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-5-mini",
    "gemini-flash",
    "gemini-flash-lite",
    "gemini-pro",
];
const ALIAS_SET = new Set(ALLOWED_ALIASES);
export function isAlias(model) {
    return ALIAS_SET.has(model);
}
/**
 * Throws if the caller tried to use a raw vendor ID like
 * `claude-sonnet-4-6-20251001` instead of an alias.
 */
export function assertAlias(model) {
    if (ALIAS_SET.has(model))
        return;
    // Common raw IDs that we want to redirect with a clear message.
    // Permissive raw-ID detector — covers known vendor naming patterns
    // (claude-<tier>-<version>, gpt-<digit>[o], o<digit>-, gemini-<digit>).
    const looksRaw = /^(claude-(sonnet|opus|haiku)-\d|gpt-[3-9]|o[1-9]-|gemini-[1-9])/i.test(model);
    if (looksRaw) {
        throw new Error(`[@thio/llm-client] Raw vendor ID "${model}" is not allowed. Use a LiteLLM alias instead — e.g. "claude-sonnet" / "fast" / "cheap". ` +
            `See ~/.claude/rules/common/llm-routing.md for the full list. ` +
            `If you need a model that isn't in ALLOWED_ALIASES, add it to ~/LiteLLM/litellm_config.yaml first.`);
    }
    throw new Error(`[@thio/llm-client] Unknown model "${model}". Allowed aliases: ${ALLOWED_ALIASES.join(", ")}.`);
}
//# sourceMappingURL=aliases.js.map