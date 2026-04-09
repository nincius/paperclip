import { describe, expect, it } from "vitest";
import {
  REDACTED_EVENT_VALUE,
  redactAdapterConfigEnvForApi,
  redactAdapterConfigForApiResponse,
  redactEventPayload,
  sanitizeRecord,
} from "../redaction.js";

describe("redaction", () => {
  it("redacts sensitive keys and nested secret values", () => {
    const input = {
      apiKey: "abc123",
      nested: {
        AUTH_TOKEN: "token-value",
        safe: "ok",
      },
      env: {
        OPENAI_API_KEY: "sk-openai",
        OPENAI_API_KEY_REF: {
          type: "secret_ref",
          secretId: "11111111-1111-1111-1111-111111111111",
        },
        OPENAI_API_KEY_PLAIN: {
          type: "plain",
          value: "sk-plain",
        },
        PAPERCLIP_API_URL: "http://localhost:3100",
      },
    };

    const result = sanitizeRecord(input);

    expect(result.apiKey).toBe(REDACTED_EVENT_VALUE);
    expect(result.nested).toEqual({
      AUTH_TOKEN: REDACTED_EVENT_VALUE,
      safe: "ok",
    });
    expect(result.env).toEqual({
      OPENAI_API_KEY: REDACTED_EVENT_VALUE,
      OPENAI_API_KEY_REF: {
        type: "secret_ref",
        secretId: "11111111-1111-1111-1111-111111111111",
      },
      OPENAI_API_KEY_PLAIN: {
        type: "plain",
        value: REDACTED_EVENT_VALUE,
      },
      PAPERCLIP_API_URL: "http://localhost:3100",
    });
  });

  it("redacts jwt-looking values even when key name is not sensitive", () => {
    const input = {
      session: "aaa.bbb.ccc",
      normal: "plain",
    };

    const result = sanitizeRecord(input);

    expect(result.session).toBe(REDACTED_EVENT_VALUE);
    expect(result.normal).toBe("plain");
  });

  it("redacts payload objects while preserving null", () => {
    expect(redactEventPayload(null)).toBeNull();
    expect(redactEventPayload({ password: "hunter2", safe: "value" })).toEqual({
      password: REDACTED_EVENT_VALUE,
      safe: "value",
    });
  });

  it("redactAdapterConfigEnvForApi redacts every plain env value, keeps secret_ref", () => {
    const env = {
      OPENAI_API_KEY: "sk-live",
      PAPERCLIP_API_URL: "http://localhost:3100",
      DB: { type: "plain", value: "postgres://x:y@host/db" },
      REF: { type: "secret_ref", secretId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", version: 1 },
    };
    expect(redactAdapterConfigEnvForApi(env)).toEqual({
      OPENAI_API_KEY: REDACTED_EVENT_VALUE,
      PAPERCLIP_API_URL: REDACTED_EVENT_VALUE,
      DB: { type: "plain", value: REDACTED_EVENT_VALUE },
      REF: { type: "secret_ref", secretId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", version: 1 },
    });
  });

  it("redactAdapterConfigForApiResponse applies env redaction then key-based redaction", () => {
    const cfg = {
      cwd: "/tmp/agent",
      env: {
        HARMLESS_URL: "http://example.com",
        nested: { leak: "no" },
      },
      apiKey: "top-secret",
    };
    const out = redactAdapterConfigForApiResponse(cfg);
    expect(out.cwd).toBe("/tmp/agent");
    expect(out.apiKey).toBe(REDACTED_EVENT_VALUE);
    expect(out.env).toEqual({
      HARMLESS_URL: REDACTED_EVENT_VALUE,
      nested: REDACTED_EVENT_VALUE,
    });
  });
});
