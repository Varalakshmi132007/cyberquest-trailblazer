import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminGate } from "@/components/AdminGate";
import { adminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — CyberQuest" },
      { name: "description", content: "Overview of CyberQuest participants and challenge statistics." },
      { property: "og:title", content: "CyberQuest Admin Dashboard" },
      { property: "og:description", content: "Hunt statistics for administrators." },
    ],
  }),
  component: () => <AdminGate><Overview /></AdminGate>,
});

function Overview() {
  const fn = useServerFn(adminOverview);
  const [d, setD] = useState<Awaited<ReturnType<typeof adminOverview>> | null>(null);
  useEffect(() => { fn().then(setD).catch(() => setD(null)); }, [fn]);
  if (!d) return <p className="font-mono text-muted-foreground">Loading…</p>;
  const stats = [["Participants", d.totals.participants], ["Completed", d.totals.completed], ["Submissions", d.totals.submissions]] as const;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(([l, v]) => (
          <div key={l} className="panel p-5"><p className="text-sm text-muted-foreground">{l}</p><p className="text-3xl font-bold text-primary">{v}</p></div>
        ))}
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="font-mono text-xs text-accent"><tr className="border-b"><th className="p-3 text-left">Level</th><th className="p-3 text-left">Challenge</th><th className="p-3 text-right">Solves</th><th className="p-3 text-right">Attempts</th><th className="p-3 text-right">Wrong</th></tr></thead>
          <tbody>
            {d.challenges.map((c) => (
              <tr key={c.id} className="border-b last:border-0"><td className="p-3 font-mono">{c.level}</td><td className="p-3">{c.title}</td><td className="p-3 text-right text-success">{c.solves}</td><td className="p-3 text-right">{c.attempts}</td><td className="p-3 text-right text-destructive">{c.wrong}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
