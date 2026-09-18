import { describe, expect, it, afterEach } from "vitest";
import { createServer, type Server } from "node:http";
import { complete } from "../complete.js";
import { resetClientForTests } from "../client.js";

/**
 * v0.4.0 contract: `outputConfig` reaches the wire as Anthropic's
 * `output_config`, and a caller that omits it sends no such field.
 *
 * Why this shape and not OpenAI's `response_format`: measured against the
 * live LiteLLM proxy on 2026-08-30 with the `claude-haiku` alias. With
 * `output_config.format` the answer came back as `{"menciones": [...]}` and
 * `JSON.parse` swallowed it whole. With `response_format` on the same
 * endpoint the proxy returned 200, dropped the field, and answered in a
 * markdown table. A schema that is silently ignored is worse than no schema
 * — the caller stops rescuing the JSON and never learns it should have.
 */

async function proxyDeMentira(): Promise<{
  url: string;
  recibido: () => Record<string, unknown> | null;
  cerrar: () => Promise<void>;
}> {
  let cuerpo: Record<string, unknown> | null = null;

  const server: Server = createServer((req, res) => {
    const trozos: Buffer[] = [];
    req.on("data", (c: Buffer) => trozos.push(c));
    req.on("end", () => {
      try {
        cuerpo = JSON.parse(Buffer.concat(trozos).toString("utf8")) as Record<string, unknown>;
      } catch {
        cuerpo = null;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-haiku",
          content: [{ type: "text", text: '{"ok":true}' }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const dir = server.address();
  if (!dir || typeof dir === "string") throw new Error("test server did not bind a port");

  return {
    url: `http://127.0.0.1:${dir.port}`,
    recibido: () => cuerpo,
    cerrar: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

const previo = { base: process.env.LITELLM_BASE_URL, api: process.env.LITELLM_API_KEY };

const esquema = {
  type: "object",
  properties: { menciones: { type: "array", items: { type: "object" } } },
  required: ["menciones"],
  additionalProperties: false,
} as const;

describe("outputConfig", () => {
  afterEach(() => {
    if (previo.base === undefined) delete process.env.LITELLM_BASE_URL;
    else process.env.LITELLM_BASE_URL = previo.base;
    if (previo.api === undefined) delete process.env.LITELLM_API_KEY;
    else process.env.LITELLM_API_KEY = previo.api;
    resetClientForTests();
  });

  async function llamar(extra: Record<string, unknown>) {
    const proxy = await proxyDeMentira();
    try {
      process.env.LITELLM_BASE_URL = proxy.url;
      process.env.LITELLM_API_KEY = "sk-test";
      resetClientForTests();
      await complete({
        agent: "healthagent",
        purpose: "intake-lab-extract",
        model: "claude-haiku",
        user: "extrae",
        maxTokens: 16,
        ...extra,
      } as never);
      return proxy.recibido();
    } finally {
      await proxy.cerrar();
    }
  }

  it("viaja al hilo como output_config", async () => {
    const cuerpo = await llamar({
      outputConfig: { format: { type: "json_schema", schema: esquema } },
    });
    expect(cuerpo?.output_config).toEqual({
      format: { type: "json_schema", schema: esquema },
    });
  });

  it("limpia las palabras que Anthropic rechaza antes de enviar (v0.4.1)", async () => {
    // Con `minimum`/`maximum` en el esquema, Anthropic devuelve 400 y el
    // proxy cae en silencio a otro modelo. Lo que tiene que llegar al hilo
    // es el esquema sin ellas.
    const cuerpo = await llamar({
      outputConfig: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              p: { type: "number", minimum: 0, maximum: 1 },
              xs: { type: "array", maxItems: 3, minItems: 2, items: { type: "string" } },
            },
            required: ["p", "xs"],
            additionalProperties: false,
          },
        },
      },
    });
    expect(cuerpo?.output_config).toEqual({
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            p: { type: "number" },
            xs: { type: "array", minItems: 1, items: { type: "string" } },
          },
          required: ["p", "xs"],
          additionalProperties: false,
        },
      },
    });
  });

  it("una raíz que no es objeto falla aquí, antes de salir, en vez de caer al respaldo", async () => {
    await expect(
      llamar({
        outputConfig: { format: { type: "json_schema", schema: { type: "array", items: { type: "string" } } } },
      }),
    ).rejects.toThrow(/root must be an object/);
  });

  it("no manda el campo cuando el llamante no lo pide", async () => {
    const cuerpo = await llamar({});
    expect(cuerpo).not.toHaveProperty("output_config");
  });

  it("no se cuela como response_format, que el proxy ignora en silencio", async () => {
    const cuerpo = await llamar({
      outputConfig: { format: { type: "json_schema", schema: esquema } },
    });
    expect(cuerpo).not.toHaveProperty("response_format");
  });
});
