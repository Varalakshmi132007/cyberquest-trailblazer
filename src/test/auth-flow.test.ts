import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AUTH_RETURN_URL, createEmailAccount, requestAccountEmail } from "@/lib/auth-flow";

const client = (auth: object) => ({ auth }) as Pick<SupabaseClient, "auth">;
describe("Existing account authentication", () => {
  it("sends signup confirmation back to the actual CyberQuest site", async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null });
    await createEmailAccount(client({ signUp }), " Test@Example.com ", "chosen-password");
    expect(signUp).toHaveBeenCalledWith({ email: "test@example.com", password: "chosen-password", options: { emailRedirectTo: "https://cyberquest-trailblazer.lovable.app/auth/callback" } });
  });
  it("uses the existing signup resend API", async () => {
    const resend = vi.fn().mockResolvedValue({ error: null });
    await requestAccountEmail(client({ resend }), " Test@Example.com ", "verification");
    expect(resend).toHaveBeenCalledWith({ type: "signup", email: "test@example.com", options: { emailRedirectTo: AUTH_RETURN_URL } });
  });
  it("does not treat an email delivery failure as success", async () => {
    const resend = vi.fn().mockResolvedValue({ error: { message: "Email service unavailable", status: 500 } });
    await expect(requestAccountEmail(client({ resend }), "test@example.com", "verification")).rejects.toThrow("Email service unavailable");
  });
  it("recovers passwords through the existing provider", async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    await requestAccountEmail(client({ resetPasswordForEmail }), "test@example.com", "recovery");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("test@example.com", { redirectTo: "https://cyberquest-trailblazer.lovable.app/auth/callback?flow=recovery" });
  });
});