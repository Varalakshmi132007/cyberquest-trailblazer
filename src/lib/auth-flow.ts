import type { SupabaseClient } from "@supabase/supabase-js";

export const AUTH_RETURN_URL = "https://cyberquest-trailblazer.lovable.app/auth/callback";
export const EMAIL_RETRY_SECONDS = 60;
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function authError(error: { code?: string | undefined; message: string; status?: number | undefined }) {
  if (error.code === "invalid_credentials") return "Email or password is incorrect. Use Forgot password to recover an existing account.";
  if (error.code === "email_not_confirmed") return "Confirm your email before signing in. Check your inbox and spam folder, or resend verification below.";
  if (error.status === 429 || error.code?.includes("rate_limit")) return "Too many requests. Wait before trying again; the email service may require a longer pause.";
  if (error.code === "otp_expired") return "This link has expired or was already used. Request a new email, or sign in if you already verified.";
  if (error.code === "user_already_exists" || error.code === "email_exists") return "An account already exists. Sign in or use Forgot password.";
  return error.message;
}

export async function createEmailAccount(client: Pick<SupabaseClient, "auth">, email: string, password: string) {
  const { data, error } = await client.auth.signUp({ email: normalizeEmail(email), password, options: { emailRedirectTo: AUTH_RETURN_URL } });
  if (error) throw new Error(authError(error));
  // Auth deliberately masks duplicate accounts; a 200 response does not prove an email was sent.
  if (data.user?.identities?.length === 0) return "If this address already has an account, sign in or use Forgot password. Otherwise check your inbox and spam folder for verification.";
  if (data.session) return "Your account is already confirmed. You can sign in.";
  return "Account request accepted. Check your inbox and spam folder for verification. Email arrival has not been confirmed.";
}

export async function requestAccountEmail(client: Pick<SupabaseClient, "auth">, email: string, kind: "verification" | "recovery") {
  const address = normalizeEmail(email);
  const { error } = kind === "verification"
    ? await client.auth.resend({ type: "signup", email: address, options: { emailRedirectTo: AUTH_RETURN_URL } })
    : await client.auth.resetPasswordForEmail(address, { redirectTo: `${AUTH_RETURN_URL}?flow=recovery` });
  if (error) throw new Error(authError(error));
  return kind === "verification"
    ? "Verification request accepted. Check your inbox and spam folder. Already verified? Sign in instead."
    : "Reset request accepted. If this email has an account, check your inbox and spam folder for a password reset link.";
}