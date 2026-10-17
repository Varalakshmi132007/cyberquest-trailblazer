import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Input } from "@/components/ui/input";
import { AdminGate } from "@/components/AdminGate";
import { adminActivityLog, adminOverview } from "@/lib/admin.functions";
import { rankParticipants } from "@/lib/monitoring";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Admin Dashboard — CyberQuest" },
      { name: "description", content: "Live monitoring of CyberQuest participants, progress and activity." },
      { property: "og:title", content: "CyberQuest Admin Dashboard" },
      { property: "og:description", content: "Real-time hunt statistics for administrators." },
    ],
  }),
  component: () => <AdminGate><Overview /></AdminGate>,
});

type Overview = Awaited<ReturnType<typeof adminOverview>>;
type LogRow = Awaited<ReturnType<typeof adminActivityLog>>[number];

const statusLabel: Record<string, string> = {
  not_started: "Not started",
  participating: "Participating",
  completed: "Completed",
  timed_out: "Timed out",
};
const statusClass: Record<string, string> = {
  not_started: "text-muted-foreground",
  participating: "text-primary",
  completed: "text-success",
  timed_out: "text-destructive",
};

const fmt = (v: string | null) => (v ? new Date(v).toLocaleString() : "—");
const countdown = (ms: number | null) => {
  if (ms === null) return "No limit";
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function Overview() {
  const load = useServerFn(adminOverview);
  const loadLog = useServerFn(adminActivityLog);
  const [d, setD] = useState<Overview | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [search, setSearch] = useState("");
  const [who, setWho] = useState("");
  const [updated, setUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [o, l] = await Promise.all([
        load(),
        loadLog({ data: { ...(search ? { search } : {}), ...(who ? { participantId: who } : {}) } }),
      ]);
      setD(o);
      setLog(l);
      setUpdated(new Date());
      setError(null);
    } catch {
      setError("Live updates unavailable. Retrying automatically…");
    }
  }, [load, loadLog, search, who]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!d) return <p className="font-mono text-muted-foreground">{error ?? "Loading…"}</p>;

  const ranked = rankParticipants(d.participants);

  const stats: [string, number | string][] = [
    ["Participants", d.totals.participants],
    ["Online", d.totals.online],
    ["Offline", d.totals.offline],
    ["Not started", d.totals.notStarted],
    ["Participating", d.totals.participating],
    ["Completed", d.totals.completed],
    ["Timed out", d.totals.timedOut],
    ["Correct answers", d.totals.correct],
    ["Wrong answers", d.totals.wrong],
    ["Hints used", d.totals.hints],
  ];

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-accent">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-success align-middle" />
          Live monitor
        </p>
        <p className="font-mono text-xs text-muted-foreground">updated {updated ? updated.toLocaleTimeString() : "—"}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([l, v]) => (
          <div key={l} className="panel p-4">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="text-2xl font-bold text-primary">{v}</p>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Live participant monitor</h2>
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="font-mono text-xs text-accent">
              <tr className="border-b">
                <th className="p-3 text-left">Participant</th>
                <th className="p-3 text-left">Session</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Current challenge</th>
                <th className="p-3 text-right">Solved</th>
                <th className="p-3 text-right">Score</th>
                <th className="p-3 text-right">Right / Wrong</th>
                <th className="p-3 text-right">Hints</th>
                <th className="p-3 text-right">Time left</th>
                <th className="p-3 text-left">Login</th>
                <th className="p-3 text-left">Logout</th>
                <th className="p-3 text-left">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {d.participants.length === 0 && (
                <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">No participants yet.</td></tr>
              )}
              {d.participants.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{p.display_name}</td>
                  <td className="p-3">
                    <span className={p.online ? "text-success" : "text-muted-foreground"}>
                      {p.online ? "● Online" : "○ Offline"}
                    </span>
                  </td>
                  <td className={`p-3 ${statusClass[p.status]}`}>{statusLabel[p.status]}</td>
                  <td className="p-3">{p.completed_at ? "—" : `L${p.current_level} ${p.currentTitle ?? ""}`}</td>
                  <td className="p-3 text-right">{p.solvedCount}</td>
                  <td className="p-3 text-right font-bold text-primary">{p.score}</td>
                  <td className="p-3 text-right"><span className="text-success">{p.correctCount}</span> / <span className="text-destructive">{p.wrongCount}</span></td>
                  <td className="p-3 text-right">{p.hintCount}</td>
                  <td className="p-3 text-right font-mono">{countdown(p.remainingMs)}</td>
                  <td className="p-3 text-muted-foreground">{fmt(p.session_started_at)}</td>
                  <td className="p-3 text-muted-foreground">{fmt(p.last_logout_at)}</td>
                  <td className="p-3 text-muted-foreground">{fmt(p.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-lg font-semibold">Live leaderboard</h2>
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="font-mono text-xs text-accent">
                <tr className="border-b"><th className="p-3 text-left">#</th><th className="p-3 text-left">Participant</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Score</th></tr>
              </thead>
              <tbody>
                {ranked.map((p, i) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3 font-mono">{i + 1}</td>
                    <td className="p-3">{p.display_name}</td>
                    <td className={`p-3 ${statusClass[p.status]}`}>{statusLabel[p.status]}</td>
                    <td className="p-3 text-right font-bold text-primary">{p.score}</td>
                  </tr>
                ))}
                {ranked.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Nothing yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold">Challenge statistics</h2>
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="font-mono text-xs text-accent">
                <tr className="border-b"><th className="p-3 text-left">Level</th><th className="p-3 text-left">Challenge</th><th className="p-3 text-right">Solves</th><th className="p-3 text-right">Attempts</th><th className="p-3 text-right">Wrong</th></tr>
              </thead>
              <tbody>
                {d.challenges.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="p-3 font-mono">{c.level}</td>
                    <td className="p-3">{c.title}</td>
                    <td className="p-3 text-right text-success">{c.solves}</td>
                    <td className="p-3 text-right">{c.attempts}</td>
                    <td className="p-3 text-right text-destructive">{c.wrong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Activity log</h2>
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="Search activity"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity…"
              className="h-9 w-56"
            />
            <select
              aria-label="Filter activity by participant"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All participants</option>
              {d.participants.map((p) => (
                <option key={p.id} value={p.id}>{p.display_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="panel max-h-[28rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card font-mono text-xs text-accent">
              <tr className="border-b"><th className="p-3 text-left">Time</th><th className="p-3 text-left">Participant</th><th className="p-3 text-left">Event</th><th className="p-3 text-left">Detail</th></tr>
            </thead>
            <tbody>
              {log.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No activity recorded.</td></tr>}
              {log.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3 font-mono text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3">{r.display_name}</td>
                  <td className="p-3 font-mono text-xs text-accent">{r.event_type}</td>
                  <td className="p-3 text-muted-foreground">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
