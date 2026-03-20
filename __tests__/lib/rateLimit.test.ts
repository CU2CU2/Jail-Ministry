import { rateLimit } from "@/lib/rateLimit";

describe("rateLimit", () => {
  it("allows requests within limit", () => {
    const key = `test-allow-${Date.now()}`;
    const result = rateLimit(key, { windowMs: 60000, max: 3 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests over limit", () => {
    const key = `test-block-${Date.now()}`;
    rateLimit(key, { windowMs: 60000, max: 2 });
    rateLimit(key, { windowMs: 60000, max: 2 });
    const third = rateLimit(key, { windowMs: 60000, max: 2 });
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("resets after window expires", async () => {
    const key = `test-reset-${Date.now()}`;
    rateLimit(key, { windowMs: 50, max: 1 });
    rateLimit(key, { windowMs: 50, max: 1 }); // blocked
    await new Promise((r) => setTimeout(r, 60));
    const result = rateLimit(key, { windowMs: 50, max: 1 });
    expect(result.allowed).toBe(true);
  });
});
