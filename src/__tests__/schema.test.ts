import { describe, expect, it } from "vitest";
import { assertObjectRoot, prepareOutputConfig, toAnthropicSchema, UNSUPPORTED_SCHEMA_KEYWORDS } from "../schema.js";

/**
 * Lo que Anthropic rechaza en `output_config.format.schema`, medido palabra a
 * palabra contra la API el 2026-09-18. Si una prueba de aquí se pone roja, un
 * agente puede volver a caer en silencio al modelo de respaldo.
 */

function keysDeep(node: unknown, acc: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((n) => keysDeep(n, acc));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      acc.push(k);
      keysDeep(v, acc);
    }
  }
  return acc;
}

describe("toAnthropicSchema", () => {
  it("quita todas las palabras rechazadas, a cualquier profundidad", () => {
    const out = toAnthropicSchema({
      type: "object",
      properties: {
        a: { type: "number", minimum: 0, maximum: 1, exclusiveMinimum: 0, exclusiveMaximum: 1, multipleOf: 0.5 },
        b: { type: "array", maxItems: 2, items: { type: "integer", minimum: 3 } },
        c: { anyOf: [{ type: "number", maximum: 9 }, { type: "string" }] },
      },
    });
    const keys = keysDeep(out);
    for (const bad of UNSUPPORTED_SCHEMA_KEYWORDS) expect(keys).not.toContain(bad);
  });

  it("conserva lo que sí se acepta", () => {
    const schema = {
      type: "object",
      properties: { s: { type: "string", enum: ["x"], minLength: 1, maxLength: 5, pattern: "^x$", format: "date" } },
      required: ["s"],
      additionalProperties: false,
    };
    expect(toAnthropicSchema(schema)).toEqual(schema);
  });

  it("un campo llamado minimum sigue siendo un campo", () => {
    const out = toAnthropicSchema({ type: "object", properties: { minimum: { type: "integer", maximum: 3 } } }) as {
      properties: Record<string, unknown>;
    };
    expect(out.properties.minimum).toEqual({ type: "integer" });
  });

  it("no toca el esquema original", () => {
    const original = { type: "number", minimum: 0 };
    toAnthropicSchema(original);
    expect(original).toEqual({ type: "number", minimum: 0 });
  });
});

describe("assertObjectRoot", () => {
  it("acepta un objeto, también sin type explícito si trae properties", () => {
    expect(() => assertObjectRoot({ type: "object" })).not.toThrow();
    expect(() => assertObjectRoot({ properties: {} })).not.toThrow();
  });

  it("rechaza listas y tipos simples en la raíz", () => {
    expect(() => assertObjectRoot({ type: "array" })).toThrow(/root must be an object/);
    expect(() => assertObjectRoot({ type: "string" })).toThrow(/root must be an object/);
  });
});

describe("prepareOutputConfig", () => {
  it("sin formato no toca nada", () => {
    const cfg = { effort: "high" as const };
    expect(prepareOutputConfig(cfg)).toBe(cfg);
  });
});
