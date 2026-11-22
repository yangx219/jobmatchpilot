import { config } from "@/middleware";

describe("middleware route coverage", () => {
  it("keeps health and independently authenticated endpoints outside session middleware", () => {
    expect(config.matcher).toContain("/api/((?!auth|mcp|health).*)");
  });

  it("continues to protect dashboard routes", () => {
    expect(config.matcher).toContain("/dashboard");
    expect(config.matcher).toContain("/dashboard/:path*");
  });
});
