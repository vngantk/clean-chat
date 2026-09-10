import { describe, expect, it } from "vitest";
import { createSystemClock } from "../src/memory/clock.js";
import { createRandomIdGenerator } from "../src/memory/id-generator.js";

describe("createSystemClock", () => {
  it("returns Unix milliseconds near Date.now()", () => {
    const before = Date.now();
    const now = createSystemClock().now();
    const after = Date.now();
    expect(Number.isInteger(now)).toBe(true);
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});

describe("createRandomIdGenerator", () => {
  it("returns distinct UUID strings", () => {
    const ids = createRandomIdGenerator();
    const a = ids.next();
    const b = ids.next();
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(b).not.toBe(a);
  });
});
