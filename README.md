# `@thio/llm-client`

Shared LLM client for an internal agent ecosystem. Wraps the Anthropic SDK with:

- **Mandatory tagging** (`agent` + `purpose`) — every call is attributable
  in LiteLLM's `spend_per_tag` and any downstream cost-monitoring
  watchdog.
- **Alias-only model selection** — raw vendor IDs like
  `claude-sonnet-4-6-20251001` are blocked at runtime.
- **Anthropic prompt caching strategies**: `system` (default, single-shot)
  and `system_and_3` (rolling window, ported from a reference impl in
  `hermes-agent/agent/prompt_caching.py`).
- **Single client init** pointed at a local LiteLLM proxy. Direct vendor
  calls are forbidden by project convention — see your local LLM
  routing rules.

## Why a shared package

An internal cost audit found each agent had reinvented its own client
wrapper, prompt-caching strategy, and tagging discipline. The same bugs
(untagged calls, raw model IDs, forgotten `cache_control`) kept
surfacing across projects. This package makes the safe path the only
path.

## Install

This package is **local-only** (never published to npm). Each consumer
adds it via the `file:` protocol:

```bash
# from a consumer repo
pnpm add file:../thio-llm-client
# or via the GitHub release tag
pnpm add github:liberathio/thio-llm-client#v0.2.0
```

Build it once before using:

```bash
cd path/to/thio-llm-client
pnpm install
pnpm build
```

## Quickstart — single-shot

```ts
import { complete } from "@thio/llm-client";

const out = await complete({
  agent: "example-agent",
  purpose: "today-pick",     // mandatory — surfaces in LiteLLM tags
  model: "claude-sonnet",    // alias only; raw IDs throw
  system: "You are an assistant…",
  user: "Pick today's project from the snapshot.",
  maxTokens: 400,
});
console.log(out.text, out.usage.cache_read_input_tokens);
```

## Quickstart — multi-turn with rolling cache

```ts
import { complete } from "@thio/llm-client";

const out = await complete({
  agent: "example-agent",
  purpose: "chat-session",
  model: "claude-sonnet",
  system: bigSystemPrompt,          // long stable prompt — cached
  messages: conversation,           // multi-turn
  cacheStrategy: "system_and_3",    // last 3 messages also cached
  maxTokens: 900,
});
```

## Streaming

```ts
import { completeStream } from "@thio/llm-client";

for await (const ev of completeStream({...})) {
  if (ev.type === "delta") process.stdout.write(ev.text);
  else if (ev.type === "done") console.log("\nusage:", ev.output.usage);
  else if (ev.type === "error") throw new Error(ev.error);
}
```

## Environment

| Var | Required | Default |
|---|---|---|
| `LITELLM_BASE_URL` | no | `http://localhost:4000` |
| `LITELLM_MASTER_KEY` | yes | — |

The package throws fast if `LITELLM_MASTER_KEY` isn't set. Your agent's
`.env.tpl` should reference your secret manager (e.g. a 1Password
`op://` ref) — never hardcode the key.

## Allowed model aliases

Defined in `src/aliases.ts`. Keep this list in sync with your local
LiteLLM `model_list`.

```
best  fast  cheap  code  smart  ultra
claude-sonnet  claude-haiku  claude-opus
gpt-4.1  gpt-4.1-mini  gpt-5-mini
gemini-flash  gemini-flash-lite  gemini-pro
```

## Migration guide

For each existing agent:

1. Replace `import Anthropic from "@anthropic-ai/sdk"` and the local
   `getClient()` wrapper with `import { complete } from "@thio/llm-client"`.
2. Replace every `client.messages.create({...})` with `complete({...})`.
   Add the `agent` + `purpose` tags.
3. Replace raw model IDs with aliases (the package will tell you which).
4. Drop your local `cachedSystem` helper if you have one — pass
   `cacheStrategy: "system"` (default) or `"system_and_3"` for chat agents.
5. Run your typecheck. Anything that doesn't compile is by design — fix
   the call site or open an issue against this package.

## Development

```bash
pnpm install
pnpm build
pnpm test
```
