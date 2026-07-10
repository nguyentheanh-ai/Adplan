import { describe, expect, it } from "vitest";
import { cleanEnvValue } from "./env";

describe("cleanEnvValue", () => {
  it("removes hidden BOM characters before values are used in HTTP headers", () => {
    expect(cleanEnvValue("\uFEFFsecret-token")).toBe("secret-token");
    expect(cleanEnvValue("Bearer \uFEFFsecret-token")).toBe("Bearer secret-token");
  });

  it("trims surrounding whitespace and returns null for empty values", () => {
    expect(cleanEnvValue("  secret-token\r\n")).toBe("secret-token");
    expect(cleanEnvValue("\uFEFF  ")).toBeNull();
    expect(cleanEnvValue(null)).toBeNull();
  });
});
