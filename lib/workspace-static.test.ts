import nextConfig from "../next.config";
import { describe, expect, it } from "vitest";

describe("removed Workspace surface", () => {
  it("redirects Workspace routes back to the AdPilot overview", async () => {
    const redirects = await nextConfig.redirects?.();

    expect(redirects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "/workspace", destination: "/", permanent: false }),
        expect.objectContaining({ source: "/workspace/:path*", destination: "/", permanent: false })
      ])
    );
  });
});
