/**
 * Public types for @thio/llm-client. Kept minimal so callers don't need to
 * import the Anthropic SDK types directly — the wrapper is the contract.
 */

/**
 * Model selection. Only LiteLLM aliases are accepted; raw vendor IDs like
 * `claude-sonnet-4-6-20251001` are blocked because they go stale and force
 * code changes in N agents every model release.
 *
 * Defined in ~/LiteLLM/litellm_config.yaml. Keep this list in sync with
 * the model_list section of that config.
 */
export type ModelAlias =
  // Tier shortcuts
  | "best"
  | "fast"
  | "cheap"
  | "code"
  | "smart"
  | "ultra"
  // Anthropic (resolved by LiteLLM to the latest tier).
  | "claude-sonnet"
  | "claude-haiku"
  | "claude-opus"
  // OpenAI
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "gpt-5-mini"
  // Gemini
  | "gemini-flash"
  | "gemini-flash-lite"
  | "gemini-pro";

/**
 * Mandatory call metadata. Every LLM call MUST be tagged so spend can be
 * attributed at the LiteLLM proxy. The watchdog at PMC's pmc-llm-monitor
 * detects untagged spikes and notifies via Telegram.
 */
export interface Tag {
  /** Short identifier of the agent making the call: "pmc", "thiobot", etc. */
  agent: string;
  /** What this specific call is for: "today-pick", "coach-session", "weekly-brief". */
  purpose: string;
  /** Optional environment for further slicing. Defaults to NODE_ENV. */
  env?: "development" | "production" | "test";
  /** Optional user identifier (e.g. Telegram chat id). Free-form. */
  userId?: string;
}

/**
 * How the caller wants prompt caching applied. `system` is enough for
 * single-shot calls (today-pick, summary). `system_and_3` is the rolling
 * window strategy from hermes-agent — best for multi-turn conversations.
 */
export type CacheStrategy = "system" | "system_and_3" | "none";

/**
 * Single-message — for one-shot calls. The wrapper sends `[{role:"user", content:user}]`.
 */
export interface SingleShot {
  user: string;
  messages?: never;
}

/**
 * Multi-turn — caller passes the full conversation. Required for chat-like
 * agents (Telegram bots, coach sessions, etc.).
 */
export interface MultiTurn {
  user?: never;
  messages: ChatMessage[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompleteInput extends Tag {
  model: ModelAlias;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  /** Defaults to "system" (cache the SYSTEM prompt). */
  cacheStrategy?: CacheStrategy;
  /** Override the default 5m TTL when needed (Anthropic supports "5m" or "1h"). */
  cacheTtl?: "5m" | "1h";
}

export type CompleteFlat = CompleteInput & (SingleShot | MultiTurn);

export interface CompleteOutput {
  text: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; output: CompleteOutput }
  | { type: "error"; error: string };
