import { z } from "zod";

// Mirrors the registerSchema in app/api/register/route.ts
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Enter a valid phone number"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  county: z.enum(["DOUGLAS", "SARPY", "BOTH"]),
  churchId: z.string().optional(),
  churchNameAlt: z.string().optional(),
  address: z.string().optional(),
});

describe("registration schema validation", () => {
  const validData = {
    name: "John Doe",
    email: "john@example.com",
    phone: "4025551234",
    password: "SecurePass1!",
    county: "DOUGLAS" as const,
    churchNameAlt: "First Baptist",
  };

  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects short passwords", () => {
    const result = registerSchema.safeParse({ ...validData, password: "short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Password must be at least 8 characters");
    }
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({ ...validData, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid county", () => {
    const result = registerSchema.safeParse({ ...validData, county: "INVALID" });
    expect(result.success).toBe(false);
  });

  it("rejects short names", () => {
    const result = registerSchema.safeParse({ ...validData, name: "A" });
    expect(result.success).toBe(false);
  });

  it("accepts BOTH as county", () => {
    const result = registerSchema.safeParse({ ...validData, county: "BOTH" });
    expect(result.success).toBe(true);
  });
});
