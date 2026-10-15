import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Rules & Instructions — CyberQuest" },
      { name: "description", content: "How CyberQuest works: levels, scoring, hints and fair play." },
      { property: "og:title", content: "CyberQuest Rules" },
      { property: "og:description", content: "Levels, scoring, hints and fair play rules." },
    ],
  }),
  component: Rules,
});

const rules = [
  ["Register", "Pick a unique display name. Your progress is tied to this browser."],
  ["Solve in order", "There are five levels. Solving one unlocks the next."],
  ["Answers", "Answers are single words or domains. Case and surrounding spaces don't matter."],
  ["Scoring", "Each level is worth points. Revealing a hint deducts its penalty when you solve that level."],
  ["Rate limits", "You can submit up to 10 answers per minute. Brute force won't help."],
  ["Leaderboard", "Ranked by score, then by who finished first."],
  ["Fair play", "Don't share answers. Use your knowledge, a pen and paper, or standard tools."],
];

function Rules() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">Rules & Instructions</h1>
      <ol className="mt-6 space-y-3">
        {rules.map(([t, d], i) => (
          <li key={t} className="panel flex gap-4 p-4">
            <span className="font-mono text-primary">{String(i + 1).padStart(2, "0")}</span>
            <div><p className="font-semibold">{t}</p><p className="text-sm text-muted-foreground">{d}</p></div>
          </li>
        ))}
      </ol>
      <Button asChild className="mt-6"><Link to="/register">I'm ready</Link></Button>
    </div>
  );
}
