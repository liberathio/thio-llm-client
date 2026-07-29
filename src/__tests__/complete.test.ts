import { describe, expect, it } from "vitest";
import { validate, buildMetadata } from "../complete.js";
import type { CompleteFlat } from "../types.js";

describe("validate", () => {
  const base: CompleteFlat = {
    agent: "pmc",
    purpose: "today-pick",
    model: "claude-sonnet",
    user: "hi",
  };

  it("accepts a well-formed single-shot", () => {
    expect(() => validate(base)).not.toThrow();
  });

  it("requires agent tag", () => {
    expect(() => validate({ ...base, agent: "" })).toThrowError(/agent/);
    expect(() => validate({ ...base, agent: "x" })).toThrowError(/agent/);
  });

  it("requires purpose tag", () => {
    expect(() => validate({ ...base, purpose: "" })).toThrowError(/purpose/);
  });

  it("rejects raw vendor IDs", () => {
    expect(() => validate({ ...base, model: "claude-sonnet-4-6-20251001" as never })).toThrowError(/Raw vendor ID/);
  });

  it("requires exactly one of user / messages", () => {
    expect(() =>
      validate({ ...base, user: undefined as never, messages: [] as never }),
    ).toThrowError(/user.*messages/);
    expect(() =>
      validate({ ...base, messages: [{ role: "user", content: "hi" }] as never }),
    ).toThrowError(/user.*messages/);
  });
});

describe("buildMetadata", () => {
  it("emits agent + purpose + env as flat keys", () => {
    const md = buildMetadata({
      agent: "pmc",
      purpose: "today-pick",
      model: "claude-sonnet",
      user: "x",
      env: "production",
    });
    expect(md.agent).toBe("pmc");
    expect(md.purpose).toBe("today-pick");
    expect(md.env).toBe("production");
  });

  it("includes user_id when provided", () => {
    const md = buildMetadata({
      agent: "thiobot",
      purpose: "coach-session",
      model: "claude-sonnet",
      user: "x",
      userId: "telegram:12345",
    });
    expect(md.user_id).toBe("telegram:12345");
  });

  // Regression: flat metadata keys are DROPPED by LiteLLM's spend tracker.
  // Only `metadata.tags` (an array of "key:value" strings) is mirrored into
  // LiteLLM_SpendLogs.request_tags / spend_per_tag. Verified empirically
  // against the live proxy 2026-07-29: a call with flat {agent,purpose}
  // landed with only User-Agent tags, while the same call with
  // metadata.tags=["agent:x","purpose:y"] landed fully attributed.
  //
  // Without this, every call through this package is unattributable and
  // escapes per-agent budget reporting. See audit 2026-07-29.
  describe("LiteLLM tag mirroring", () => {
    it("emits a tags array so LiteLLM attributes the spend", () => {
      const md = buildMetadata({
        agent: "pmc",
        purpose: "today-pick",
        model: "claude-sonnet",
        user: "x",
        env: "production",
      });
      expect(md.tags).toEqual(["agent:pmc", "purpose:today-pick", "env:production"]);
    });

    it("adds a user tag when userId is provided", () => {
      const md = buildMetadata({
        agent: "thiobot",
        purpose: "coach-session",
        model: "claude-sonnet",
        user: "x",
        userId: "telegram:12345",
      });
      expect(md.tags).toContain("user:telegram:12345");
    });

    it("keeps tags free of characters that break tag parsing", () => {
      const md = buildMetadata({
        agent: "weird agent,name",
        purpose: "some purpose",
        model: "claude-sonnet",
        user: "x",
      });
      for (const tag of md.tags as string[]) {
        expect(tag).not.toMatch(/[,\s]/);
      }
    });
  });
});
