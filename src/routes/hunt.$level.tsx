import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getChallenge, requestHint, submitAnswer } from "@/lib/hunt.functions";
import { getToken } from "@/lib/session";

export const Route = createFileRoute("/hunt/$level")({
  head: ({ params }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: `Level ${params.level} — CyberQuest` },
      { name: "description", content: `Solve CyberQuest challenge level ${params.level}.` },
      { property: "og:title", content: `CyberQuest Level ${params.level}` },
      { property: "og:description", content: "Crack the code to unlock the next vault." },
    ],
  }),
  component: ChallengePage,
});

type Data = Awaited<ReturnType<typeof getChallenge>>;

function ChallengePage() {
  const { level } = Route.useParams();
  const lvl = Number(level);
  const navigate = useNavigate();
  const fetchChallenge = useServerFn(getChallenge);
  const hintFn = useServerFn(requestHint);
  const submitFn = useServerFn(submitAnswer);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string; next?: number | null; done?: boolean } | null>(null);

  const load = useCallback(() => {
    const token = getToken();
    if (!token) {
      navigate({ to: "/register" });
      return;
    }
    setFeedback(null);
    setAnswer("");
    fetchChallenge({ data: { token, level: lvl } }).then(setData).catch((e) => setError(e.message));
  }, [fetchChallenge, lvl, navigate]);
  useEffect(() => { load(); }, [load]);

  const showHint = async () => {
    if (!data) return;
    if (!confirm(`Reveal hint? This costs ${data.challenge.hint_penalty} points if you solve this level.`)) return;
    try {
      const { hint } = await hintFn({ data: { token: getToken()!, level: lvl } });
      setData({ ...data, challenge: { ...data.challenge, hint } });
    } catch (e) { toast.error((e as Error).message); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await submitFn({ data: { token: getToken()!, level: lvl, answer } });
      if (r.correct) {
        setFeedback({ ok: true, msg: r.alreadySolved ? "Already solved." : `Access granted! +${r.points} points`, next: "nextLevel" in r ? r.nextLevel : null, done: r.completed });
        setData((d) => (d ? { ...d, solved: true } : d));
      } else setFeedback({ ok: false, msg: "Access denied. That's not it — try again." });
    } catch (e) { setFeedback({ ok: false, msg: (e as Error).message }); }
    finally { setBusy(false); }
  };

  if (error)
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <p className="text-destructive">{error}</p>
        <Button asChild className="mt-4"><Link to="/hunt">Back to dashboard</Link></Button>
      </div>
    );
  if (!data) return <p className="text-center font-mono text-muted-foreground">Decrypting…</p>;
  const c = data.challenge;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/hunt" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> Dashboard</Link>
      <div className="panel p-6 md:p-8">
        <p className="font-mono text-xs text-accent">LEVEL {c.level}/{data.totalLevels} · {c.category} · {c.points} pts</p>
        <h1 className="mt-2 text-3xl font-bold">{c.title}</h1>
        <p className="mt-3 text-muted-foreground">{c.description}</p>
        <pre className="mt-6 overflow-x-auto whitespace-pre-wrap rounded-lg border bg-background p-4 font-mono text-lg text-primary">{c.puzzle}</pre>

        {c.hint ? (
          <div className="mt-6 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm"><Lightbulb className="mr-2 inline h-4 w-4 text-accent" />{c.hint}</div>
        ) : !data.solved && (
          <Button variant="outline" className="mt-6" onClick={showHint}><Lightbulb /> Reveal hint (−{c.hint_penalty} pts)</Button>
        )}

        {!data.solved ? (
          <form onSubmit={submit} className="mt-6 space-y-2">
            <Label htmlFor="answer">Your answer</Label>
            <div className="flex gap-2">
              <Input id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} required maxLength={200} className="font-mono" autoComplete="off" />
              <Button type="submit" disabled={busy}>{busy ? "Checking…" : "Submit"}</Button>
            </div>
          </form>
        ) : null}

        {feedback && (
          <div role="status" className={`mt-6 flex items-center gap-2 rounded-lg border p-4 ${feedback.ok ? "border-success/50 text-success" : "border-destructive/50 text-destructive"}`}>
            {feedback.ok ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}{feedback.msg}
          </div>
        )}
        {data.solved && (
          <div className="mt-6 flex gap-2">
            {feedback?.done || (!feedback?.next && c.level === data.totalLevels) ? (
              <Button asChild><Link to="/complete">Open the treasure</Link></Button>
            ) : feedback?.next ? (
              <Button asChild><Link to="/hunt/$level" params={{ level: String(feedback.next) }}>Next level →</Link></Button>
            ) : (
              <Button asChild><Link to="/hunt">Back to dashboard</Link></Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
