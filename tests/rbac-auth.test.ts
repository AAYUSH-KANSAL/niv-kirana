import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/owner-credentials", () => ({
  verifyOwnerCredentials: vi.fn(async (loginId: string, password: string) => {
    const isId = loginId.toLowerCase() === "owner" || loginId.toLowerCase() === "niv027" || loginId.toLowerCase() === "owner@nivkirana.com";
    return isId && (password === "Owner@123" || password === "Niv@@002277");
  }),
}));

// Mock supabase client methods
vi.mock("../lib/supabase", () => {
  const mockProfiles: any[] = [
    {
      id: "owner-1",
      name: "Store Owner",
      phone: "9999999999",
      email: "owner@nivkirana.com",
      role: "admin",
      status: "approved",
    },
    {
      id: "cust-pending-1",
      name: "Pending User",
      phone: "9123456789",
      email: "pending@test.com",
      role: "customer",
      status: "pending",
    },
    {
      id: "cust-approved-1",
      name: "Approved User",
      phone: "9876501234",
      email: "approved@test.com",
      role: "customer",
      status: "approved",
    },
  ];

  return {
    supabase: {
      auth: {
        signUp: vi.fn(async ({ email }) => {
          if (email === "existing@test.com") {
            return { data: { user: null }, error: { message: "User already registered" } };
          }
          return { data: { user: { id: "new-user-id", email } }, error: null };
        }),
        signInWithPassword: vi.fn(async ({ email, password }) => {
          if (password === "wrongpass") {
            return { data: { user: null }, error: { message: "Invalid login credentials" } };
          }
          const prof = mockProfiles.find((p) => p.email === email);
          if (prof) {
            return { data: { user: { id: prof.id, email: prof.email } }, error: null };
          }
          return { data: { user: null }, error: { message: "Invalid login credentials" } };
        }),
        signOut: vi.fn(async () => {}),
        getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
      from: vi.fn((table: string) => {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, val: string) => ({
              single: vi.fn(async () => {
                const match = mockProfiles.find((p) => p[field] === val);
                return { data: match || null, error: match ? null : { message: "Not found" } };
              }),
              maybeSingle: vi.fn(async () => {
                const match = mockProfiles.find((p) => p[field] === val);
                return { data: match || null, error: null };
              }),
            })),
          })),
          upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: {}, error: null })),
              single: vi.fn(async () => ({ data: {}, error: null })),
            })),
          })),
        };
      }),
    },
  };
});

import { signInUnified, signUpCustomer } from "../lib/supabase-service";

describe("RBAC and Auth Validations", () => {
  it("authenticates store owner directly into admin mode", async () => {
    const res = await signInUnified({
      identifier: "owner@nivkirana.com",
      password: "Owner@123",
    });
    expect(res.role).toBe("admin");
    expect(res.status).toBe("approved");
  });

  it("authenticates store owner with alias 'owner'", async () => {
    const res = await signInUnified({
      identifier: "owner",
      password: "Owner@123",
    });
    expect(res.role).toBe("admin");
  });

  it("blocks customer login if status is pending approval", async () => {
    await expect(
      signInUnified({
        identifier: "pending@test.com",
        password: "ValidPassword123",
      })
    ).rejects.toThrow("Approval Pending");
  });

  it("throws 'This is not registered email' when email does not exist", async () => {
    await expect(
      signInUnified({
        identifier: "unregistered@nowhere.com",
        password: "SomePassword123",
      })
    ).rejects.toThrow("This is not registered email");
  });

  it("throws 'This mobile number is not registered.' when phone does not exist", async () => {
    await expect(
      signInUnified({
        identifier: "9000000000",
        password: "SomePassword123",
      })
    ).rejects.toThrow("This mobile number is not registered.");
  });

  it("throws 'User already exists with this mobile number' on duplicate phone registration", async () => {
    await expect(
      signUpCustomer({
        name: "Duplicate Mobile",
        phone: "9123456789", // already in mockProfiles
        email: "brandnew@test.com",
        password: "Password123",
      })
    ).rejects.toThrow("User already exists with this mobile number");
  });

  it("throws 'User already exists with this email address' on duplicate email registration", async () => {
    await expect(
      signUpCustomer({
        name: "Duplicate Email",
        phone: "9888888888",
        email: "pending@test.com", // already in mockProfiles
        password: "Password123",
      })
    ).rejects.toThrow("User already exists with this email address");
  });

  it("allows approved customer to sign in successfully", async () => {
    const res = await signInUnified({
      identifier: "approved@test.com",
      password: "Password123",
    });
    expect(res.role).toBe("customer");
    expect(res.status).toBe("approved");
  });
});
