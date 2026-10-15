import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminGate } from "@/components/AdminGate";
import { adminOverview, adminParticipantAction } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/participants")({
  head: () => ({
    meta: [
      { title: "Participants & Results — CyberQuest Admin" },
      { name: "description", content: "Manage CyberQuest participants and their results." },
      { property: "og:title", content: "CyberQuest Participants" },
      { property: "og:description", content: "Participant and results management." },
    ],
  }),
  component: () => <AdminGate><Participants /></AdminGate>,
});

function Participants() {
  const list = useServerFn(adminOverview);
  const act = useServerFn(adminParticipantAction);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof adminOverview>>["participants"]>([]);
  const load = useCallback(() => list().then((d) => setRows(d.participants)).catch((e) => toast.error(e.message)), [list]);
  useEffect(() => { load(); }, [load]);

  const run = async (id: string, action: "reset" | "delete", name: string) => {
    if (!confirm(`${action === "delete" ? "Delete" : "Reset progress for"} ${name}?`)) return;
    try { await act({ data: { id, action } }); toast.success("Done"); load(); } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="font-mono text-xs text-accent"><tr className="border-b"><th className="p-3 text-left">Name</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Score</th><th className="p-3 text-left">Joined</th><th className="p-3" /></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No participants yet.</td></tr>}
          {rows.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="p-3 font-medium">{p.display_name}</td>
              <td className="p-3">{p.completed_at ? <span className="text-success">Completed</span> : `Level ${p.current_level}`}</td>
              <td className="p-3 text-right font-bold text-primary">{p.score}</td>
              <td className="p-3 text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
              <td className="flex justify-end gap-2 p-3">
                <Button size="sm" variant="outline" onClick={() => run(p.id, "reset", p.display_name)}>Reset</Button>
                <Button size="sm" variant="destructive" onClick={() => run(p.id, "delete", p.display_name)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
