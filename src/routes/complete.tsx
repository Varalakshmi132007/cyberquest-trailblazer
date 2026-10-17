import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProgress } from "@/lib/hunt.functions";
import { getToken } from "@/lib/session";

export const Route = createFileRoute("/complete")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Treasure Unlocked — CyberQuest" },
      { name: "description", content: "You cracked every vault in CyberQuest." },
      { property: "og:title", content: "CyberQuest Treasure Unlocked" },
      { property: "og:description", content: "All five cybersecurity challenges solved." },
    ],
  }),
  component: Complete,
});

function Complete() {
  const fetchProgress = useServerFn(getProgress);
  const navigate = useNavigate();
  const [data, setData] = useState<Awaited<ReturnType<typeof getProgress>> | null>(null);
  useEffect(() => {
    const t = getToken();
    if (!t) return void navigate({ to: "/register" });
    fetchProgress({ data: { token: t } }).then(setData).catch(() => navigate({ to: "/register" }));
  }, [fetchProgress, navigate]);
  if (!data) return <p className="text-center font-mono text-muted-foreground">Loading…</p>;
  if (!data.participant.completed_at)
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <p>The treasure is still locked. Keep hunting!</p>
        <Button asChild className="mt-4"><Link to="/hunt">Back to the hunt</Link></Button>
      </div>
    );
  return (
    <div className="panel mx-auto max-w-xl p-10 text-center glow">
      <Trophy className="mx-auto h-16 w-16 text-primary" />
      <h1 className="mt-4 text-4xl font-bold text-glow">Treasure Unlocked</h1>
      <p className="mt-3 text-muted-foreground">Well done, {data.participant.display_name}. You cracked every vault.</p>
      <pre className="mt-6 rounded-lg border bg-background p-4 font-mono text-success">FLAG{"{"}stay_curious_stay_secure{"}"}</pre>
      <p className="mt-6 text-5xl font-bold text-primary">{data.participant.score}</p>
      <p className="text-sm text-muted-foreground">final score</p>
      <Button asChild className="mt-6"><Link to="/leaderboard">See the leaderboard</Link></Button>
    </div>
  );
}
