import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/hunt.functions";

const lbQuery = queryOptions({ queryKey: ["leaderboard"], queryFn: () => getLeaderboard(), refetchInterval: 15000 });

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — CyberQuest" },
      { name: "description", content: "Top CyberQuest operators ranked by score." },
      { property: "og:title", content: "CyberQuest Leaderboard" },
      { property: "og:description", content: "See who's cracking the most vaults." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(lbQuery),
  component: Leaderboard,
});

function Leaderboard() {
  const { data } = useSuspenseQuery(lbQuery);
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold">Leaderboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Ties are broken by earliest completion. Updates every 15 seconds.</p>
      <div className="panel mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="font-mono text-xs text-accent">
            <tr className="border-b"><th className="p-3 text-left">#</th><th className="p-3 text-left">Operator</th><th className="p-3 text-left">Level</th><th className="p-3 text-right">Score</th></tr>
          </thead>
          <tbody>
            {data.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No participants yet — be the first!</td></tr>}
            {data.map((p, i) => (
              <tr key={p.display_name} className="border-b last:border-0">
                <td className="p-3 font-mono">{i + 1}</td>
                <td className="p-3 font-medium">{p.display_name}</td>
                <td className="p-3">{p.completed_at ? <span className="text-success">Completed</span> : `Level ${p.current_level}`}</td>
                <td className="p-3 text-right font-bold text-primary">{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
