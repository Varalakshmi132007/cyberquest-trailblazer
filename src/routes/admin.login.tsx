import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { authError, createEmailAccount, EMAIL_RETRY_SECONDS, normalizeEmail, requestAccountEmail } from "@/lib/auth-flow";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Admin Login — CyberQuest" },
      { name: "description", content: "Sign in to manage CyberQuest challenges and participants." },
      { property: "og:title", content: "CyberQuest Admin Login" },
      { property: "og:description", content: "Administrator sign-in." },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [retryAt, setRetryAt] = useState(0);
  const [clock, setClock] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const wait = Math.max(0, Math.ceil((retryAt - clock) / 1000));
  const cooldown = () => { const now = Date.now(); setClock(now); setRetryAt(now + EMAIL_RETRY_SECONDS * 1000); };

  const sendEmail = async (kind: "verification" | "recovery") => {
    if (!normalizeEmail(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) { setFailed(true); setMessage("Enter your account email address first."); return; }
    if (busy || wait > 0) return;
    setBusy(true); setFailed(false); cooldown();
    try { setMessage(await requestAccountEmail(supabase, email, kind)); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Email request failed. Try again later."); }
    finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || (mode === "up" && wait > 0)) return;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      if (mode === "in") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });
        if (error) throw new Error(authError(error));
        if (!data.user?.email_confirmed_at) { await supabase.auth.signOut(); throw new Error("Confirm your email before signing in."); }
        await navigate({ to: "/admin" });
      } else {
        cooldown();
        setMessage(await createEmailAccount(supabase, email, password));
      }
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="panel mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">{mode === "in" ? "Admin login" : "Create account"}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={mode === "up" ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        <Button type="submit" className="w-full" disabled={busy || (mode === "up" && wait > 0)}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</Button>
      </form>
      {message && <p role={failed ? "alert" : "status"} className={`mt-4 text-sm ${failed ? "text-destructive" : "text-muted-foreground"}`}>{message}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={busy || wait > 0} onClick={() => sendEmail("verification")}>Resend verification email</Button>
        <Button variant="ghost" size="sm" disabled={busy || wait > 0} onClick={() => sendEmail("recovery")}>Forgot password</Button>
      </div>
      {wait > 0 && <p className="mt-2 text-xs text-muted-foreground" role="status">Request another email in {wait}s.</p>}
      <Button type="button" variant="link" className="mt-4 px-0 text-sm" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMessage(""); }}>
        {mode === "in" ? "No account? Create one" : "Have an account? Sign in"}
      </Button>
    </div>
  );
}
