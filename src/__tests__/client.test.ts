import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getClient, resetClientForTests } from "../client.js";

const ENV_KEYS = ["LITELLM_API_KEY", "LITELLM_MASTER_KEY", "LITELLM_BASE_URL"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  resetClientForTests();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetClientForTests();
});

describe("getClient key resolution", () => {
  it("prefers LITELLM_API_KEY (per-agent virtual key) over LITELLM_MASTER_KEY", () => {
    process.env.LITELLM_API_KEY = "sk-virtual-agent";
    process.env.LITELLM_MASTER_KEY = "sk-master";
    expect(getClient().apiKey).toBe("sk-virtual-agent");
  });

  it("falls back to LITELLM_MASTER_KEY when no virtual key is set", () => {
    process.env.LITELLM_MASTER_KEY = "sk-master";
    expect(getClient().apiKey).toBe("sk-master");
  });

  it("fails fast naming both vars when neither is set", () => {
    expect(() => getClient()).toThrow(/LITELLM_API_KEY.*LITELLM_MASTER_KEY/s);
  });

  it("caches the singleton until resetClientForTests", () => {
    process.env.LITELLM_MASTER_KEY = "sk-master";
    const first = getClient();
    process.env.LITELLM_API_KEY = "sk-virtual-agent";
    expect(getClient()).toBe(first); // still the cached instance
    resetClientForTests();
    expect(getClient().apiKey).toBe("sk-virtual-agent");
  });
});
