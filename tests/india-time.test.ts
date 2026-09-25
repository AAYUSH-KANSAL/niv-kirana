import { describe, expect, it } from "vitest";

import { formatIndianTime, indianTimeGreeting } from "../shared/india-time";

describe("Indian time greeting", () => {
  it("uses India time rather than the device timezone for the greeting", () => {
    expect(indianTimeGreeting(new Date("2026-08-27T02:00:00.000Z"))).toBe("Good morning");
    expect(indianTimeGreeting(new Date("2026-08-27T08:00:00.000Z"))).toBe("Good afternoon");
    expect(indianTimeGreeting(new Date("2026-08-27T13:30:00.000Z"))).toBe("Good evening");
    expect(indianTimeGreeting(new Date("2026-08-27T18:30:00.000Z"))).toBe("Good night");
  });

  it("formats the visible time in Indian twelve-hour format", () => {
    expect(formatIndianTime(new Date("2026-08-27T02:00:00.000Z"))).toMatch(/7:30\s?am/i);
  });
});
