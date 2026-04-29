# `@thio/llm-client`

Shared LLM client for Thio's agent ecosystem (PMC, ThioBot, hermes-agent,
LaPareditaAgent, inner-coach, future agents). Wraps the Anthropic SDK with:

- **Mandatory tagging** (`agent` + `purpose`) — every call is attributable
  in LiteLLM's `spend_per_tag` and PMC's `pmc-llm-monitor` watchdog.
- **Alias-only model selection** — raw vendor IDs like
  `claude-sonnet-4-6-20251001` are blocked at runtime.
- **Anthropic prompt caching strategies**: `system` (default, single-shot)
  and `system_and_3` (rolling window, ported from hermes-agent's reference
  impl).
- **Single client init** pointed at the local LiteLLM proxy. Direct vendor
  calls are forbidden — see `~/.claude/rules/common/llm-routing.md`.

## Why a shared package

The 2026-04 cost audit (PMC `docs/audits/llm-cost-2026-04-29.md`) found
each agent had reinvented its own client wrapper, prompt-caching strategy,
and tagging discipline. Same bugs (untagged calls, raw model IDs,
forgotten `cache_control`) surfaced across projects. This package makes
the safe path the only path.

## Install

This package is **local-only** (never published to npm). Each consumer
adds it via the file: protocol:

```bash
# from your agent repo
pnpm add file:../thio-llm-client
# or, with absolute path
pnpm add file:/Users/thio/Proyectos/thio-llm-client
```

Build it once before using:

```bash
cd ~/Proyectos/thio-llm-client
pnpm install
pnpm build
```

## Quickstart — single-shot

```ts
import { complete } from "@thio/llm-client";

const out = await complete({
  agent: "pmc",
  purpose: "today-pick",     // mandatory — surfaces in LiteLLM tags
  model: "claude-sonnet",    // alias only; raw IDs throw
  system: "You are PMC's product manager…",
  user: "Pick today's project from the snapshot.",
  maxTokens: 400,
});
console.log(out.text, out.usage.cache_read_input_tokens);
```

## Quickstart — multi-turn with rolling cache

```ts
import { complete } from "@thio/llm-client";

const out = await complete({
  agent: "inner-coach",
  purpose: "coach-session",
  model: "claude-sonnet",
  system: bigCoachPrompt,           // ~5000 tokens — cached
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

The package throws fast if `LITELLM_MASTER_KEY` isn't set. The agent's
`.env.tpl` should reference `op://ThioBot/LiteLLM Master Key/password`.

## Allowed model aliases

Defined in `src/aliases.ts`. Sync with `~/LiteLLM/litellm_config.yaml`.

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

PMC was migrated as the proof-of-concept (commit reference in PMC repo).
See `docs/audits/llm-cost-2026-04-29.md` for the audit context.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

Tests are unit-level only — they do NOT hit the LiteLLM proxy. The
`getClient()` factory is the only network seam and is intentionally not
mocked here; integration tests live in each consumer.

## License

Private — Thio's ecosystem only. Not for external use.
