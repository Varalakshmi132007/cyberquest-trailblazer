import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Lock, Unlock, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getProgress } from "@/lib/hunt.functions";
import { clearToken, getToken } from "@/lib/session";

export const Route = createFileRoute("/hunt/")({
  head: () => ({
    meta: [
      { title: "Hunt Dashboard — CyberQuest" },
      { name: "description", content: "Track your progress through the five CyberQuest challenges." },
      { property: "og:title", content: "CyberQuest Hunt Dashboard" },
      { property: "og:description", content: "Your levels, points and progress." },
    ],
  }),
  component: Hunt,
});

type Data = Awaited<ReturnType<typeof getProgress>>;

function Hunt() {
  const fetchProgress = useServerFn(getProgress);
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate({ to: "/register" });
      return;
    }
    fetchProgress({ data: { token } }).then(setData).catch((e) => setError(e.message));
  }, [fetchProgress, navigate]);

  if (error)
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <p className="text-destructive">{error}</p>
        <Button className="mt-4" onClick={() => { clearToken(); navigate({ to: "/register" }); }}>Register again</Button>
      </div>
    );
  if (!data) return <p className="text-center font-mono text-muted-foreground">Loading…</p>;

  const solved = data.challenges.filter((c) => c.solved).length;
  const total = data.challenges.length;
  return (
    <div className="space-y-6">
      <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="font-mono text-xs text-accent">operator</p>
          <h1 className="text-2xl font-bold">{data.participant.display_name}</h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-primary">{data.participant.score}</p>
          <p className="text-xs text-muted-foreground">points</p>
        </div>
        <div className="w-full">
          <Progress value={total ? (solved / total) * 100 : 0} />
          <p className="mt-2 text-sm text-muted-foreground">{solved} of {total} vaults cracked</p>
        </div>
        {data.participant.completed_at && (
          <Button asChild className="w-full"><Link to="/complete">View your treasure</Link></Button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.challenges.map((c) => {
          const card = (
            <div className={`panel h-full p-5 transition ${c.unlocked ? "hover:glow" : "opacity-50"}`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-accent">LEVEL {c.level} · {c.category}</span>
                {c.solved ? <CheckCircle2 className="h-5 w-5 text-success" /> : c.unlocked ? <Unlock className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5" />}
              </div>
              <h2 className="mt-2 text-lg font-semibold">{c.unlocked ? c.title : "Locked vault"}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                {c.points} pts {c.hintUsed && <><Lightbulb className="h-3 w-3" /> hint used</>}
              </p>
            </div>
          );
          return c.unlocked ? (
            <Link key={c.id} to="/hunt/$level" params={{ level: String(c.level) }}>{card}</Link>
          ) : (
            <div key={c.id} aria-disabled>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
