import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { authError } from "@/lib/auth-flow";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [
    { title: "Account Confirmation — CyberQuest" },
    { name: "description", content: "Confirm your CyberQuest account or securely reset your password." },
    { property: "og:title", content: "CyberQuest Account Confirmation" },
    { property: "og:description", content: "Secure account verification and password recovery." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: AuthCallback,
});

function AuthCallback() {
  const [state, setState] = useState<"checking" | "verified" | "recovery" | "error" | "updated">("checking");
  const [message, setMessage] = useState("Checking your account link…");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const confirm = async () => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.slice(1));
      const recovery = url.searchParams.get("flow") === "recovery" || hash.get("type") === "recovery";
      try {
        const linkError = url.searchParams.get("error_description") || hash.get("error_description");
        if (linkError) throw new Error("This link is invalid, expired or already used. Request another email, or sign in if already verified.");
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw new Error(authError(error));
        } else {
          // The existing client consumes implicit-flow links and persists the session.
          await supabase.auth.getSession();
        }
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user?.email_confirmed_at) throw new Error("No verified session found. Open the latest email link or request a new one.");
        window.history.replaceState({}, "", url.pathname + (recovery ? "?flow=recovery" : ""));
        if (active) { setState(recovery ? "recovery" : "verified"); setMessage(recovery ? "Choose a new password." : "Your email is confirmed. You can now sign in."); }
      } catch (error) {
        window.history.replaceState({}, "", url.pathname);
        if (active) { setState("error"); setMessage(error instanceof Error ? error.message : "Account confirmation failed. Request a new link."); }
      }
    };
    void confirm();
    return () => { active = false; };
  }, []);

  const update = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(authError(error));
      await supabase.auth.signOut();
      setState("updated"); setMessage("Password updated. Sign in with your new password.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update password."); }
    finally { setBusy(false); }
  };
  return <div className="panel mx-auto max-w-md p-8">
    <h1 className="text-2xl font-bold">{state === "recovery" ? "Reset password" : "Account confirmation"}</h1>
    <p className="mt-4 text-sm text-muted-foreground" role="status">{message}</p>
    {state === "recovery" && <form onSubmit={update} className="mt-6 space-y-4">
      <Label htmlFor="new-password">New password</Label>
      <Input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
      <Button disabled={busy} className="w-full">{busy ? "Updating…" : "Save password"}</Button>
    </form>}
    {state !== "checking" && <Button asChild variant="outline" className="mt-6"><Link to="/admin/login">Return to sign in</Link></Button>}
  </div>;
}