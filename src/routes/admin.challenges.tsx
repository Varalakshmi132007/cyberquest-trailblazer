import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AdminGate } from "@/components/AdminGate";
import { adminDeleteChallenge, adminListChallenges, adminSaveChallenge } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/challenges")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Challenge Management — CyberQuest Admin" },
      { name: "description", content: "Create and edit CyberQuest challenges." },
      { property: "og:title", content: "CyberQuest Challenge Management" },
      { property: "og:description", content: "Manage puzzles, answers, hints and points." },
    ],
  }),
  component: () => <AdminGate><Challenges /></AdminGate>,
});

type Row = Awaited<ReturnType<typeof adminListChallenges>>[number];
type Form = Omit<Row, "id"> & { id?: string; answer: string };
const blank = (level: number): Form => ({ level, title: "", category: "", description: "", puzzle: "", hint: "", points: 100, hint_penalty: 25, active: true, answer: "" });

function Challenges() {
  const list = useServerFn(adminListChallenges);
  const save = useServerFn(adminSaveChallenge);
  const del = useServerFn(adminDeleteChallenge);
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const load = useCallback(() => list().then(setRows).catch((e) => toast.error(e.message)), [list]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      await save({ data: { ...form, answer: form.answer || undefined } });
      toast.success("Challenge saved");
      setForm(null);
      load();
    } catch (err) { toast.error((err as Error).message); }
  };
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="space-y-4">
      <Button onClick={() => setForm(blank((rows.at(-1)?.level ?? 0) + 1))}>New challenge</Button>
      {form && (
        <form onSubmit={submit} className="panel grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-1"><Label>Level</Label><Input type="number" min={1} value={form.level} onChange={(e) => set("level", Number(e.target.value))} required /></div>
          <div className="space-y-1"><Label>Category</Label><Input value={form.category} onChange={(e) => set("category", e.target.value)} required /></div>
          <div className="space-y-1 md:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => set("title", e.target.value)} required /></div>
          <div className="space-y-1 md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} required /></div>
          <div className="space-y-1 md:col-span-2"><Label>Puzzle</Label><Textarea className="font-mono" value={form.puzzle} onChange={(e) => set("puzzle", e.target.value)} required /></div>
          <div className="space-y-1 md:col-span-2"><Label>Hint</Label><Textarea value={form.hint} onChange={(e) => set("hint", e.target.value)} required /></div>
          <div className="space-y-1"><Label>Points</Label><Input type="number" min={0} value={form.points} onChange={(e) => set("points", Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>Hint penalty</Label><Input type="number" min={0} value={form.hint_penalty} onChange={(e) => set("hint_penalty", Number(e.target.value))} /></div>
          <div className="space-y-1"><Label>{form.id ? "New answer (leave blank to keep)" : "Answer"}</Label><Input value={form.answer} onChange={(e) => set("answer", e.target.value)} required={!form.id} /></div>
          <div className="flex items-center gap-2 pt-6"><Switch checked={form.active} onCheckedChange={(v) => set("active", v)} id="active" /><Label htmlFor="active">Active</Label></div>
          <div className="flex gap-2 md:col-span-2"><Button type="submit">Save</Button><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancel</Button></div>
        </form>
      )}
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="font-mono text-xs text-accent"><tr className="border-b"><th className="p-3 text-left">Lvl</th><th className="p-3 text-left">Title</th><th className="p-3 text-left">Category</th><th className="p-3 text-right">Pts</th><th className="p-3 text-left">Status</th><th className="p-3" /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-3 font-mono">{r.level}</td><td className="p-3">{r.title}</td><td className="p-3 text-muted-foreground">{r.category}</td><td className="p-3 text-right">{r.points}</td>
                <td className="p-3">{r.active ? <span className="text-success">Active</span> : <span className="text-muted-foreground">Hidden</span>}</td>
                <td className="flex justify-end gap-2 p-3">
                  <Button size="sm" variant="outline" onClick={() => setForm({ ...r, answer: "" })}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={async () => {
                    if (!confirm(`Delete "${r.title}"? Related solves are removed.`)) return;
                    try { await del({ data: { id: r.id } }); load(); } catch (e) { toast.error((e as Error).message); }
                  }}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
