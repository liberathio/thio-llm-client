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
  /**
   * Anthropic tools (v0.2.0+). Pass the tool definitions and the wrapper
   * will run a single round-trip and return either text OR tool_use
   * blocks for the caller to dispatch and continue. The wrapper does NOT
   * orchestrate the tool loop itself — that's the agent's responsibility,
   * because tool dispatch is intrinsically agent-specific.
   */
  tools?: ToolDefinition[];
}

export interface ToolDefinition {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface TextBlock {
  type: "text";
  text: string;
}

export type ContentBlock = TextBlock | ToolUseBlock;

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
  /** Reason the model stopped — surface for tool loops. v0.2.0+. */
  stopReason?: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | string;
  /** Full content blocks (text + tool_use). v0.2.0+. */
  content?: ContentBlock[];
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; output: CompleteOutput }
  | { type: "error"; error: string };
