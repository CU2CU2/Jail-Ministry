"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function loginAction(email: string, password: string) {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (err) {
    if (err instanceof AuthError) {
      switch (err.type) {
        case "CredentialsSignin":
          return { error: "CredentialsSignin" };
        default:
          return { error: err.message ?? "Unknown error" };
      }
    }
    throw err; // re-throw non-auth errors
  }
}
