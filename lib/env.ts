const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "RESEND_API_KEY",
  "NEXTAUTH_URL",
] as const;

export function validateEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
}

// Auto-validate on import in production
validateEnv();
