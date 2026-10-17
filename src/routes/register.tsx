import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerParticipant } from "@/lib/hunt.functions";
import { setToken } from "@/lib/session";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Register — CyberQuest" },
      { name: "description", content: "Pick a display name and join the CyberQuest treasure hunt." },
      { property: "og:title", content: "Join CyberQuest" },
      { property: "og:description", content: "Register to start the cybersecurity treasure hunt." },
    ],
  }),
  component: Register,
});

function Register() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const register = useServerFn(registerParticipant);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { token } = await register({ data: { displayName: name } });
      setToken(token);
      toast.success("Welcome, operator. Good luck!");
      navigate({ to: "/hunt" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg.startsWith("[") ? "Name must be 3–24 letters, numbers, spaces, - or _" : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Register</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a public display name for the leaderboard.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={24} required placeholder="e.g. NullByte" />
          <p className="text-xs text-muted-foreground">3–24 characters. Your progress is saved on this device.</p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Registering…" : "Begin hunt"}</Button>
      </form>
    </div>
  );
}
