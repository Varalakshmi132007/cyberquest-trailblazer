import { createFileRoute, Link } from "@tanstack/react-router";
import { KeyRound, Lock, ShieldCheck, Trophy, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberQuest — Crack the codes. Unlock the treasure." },
      { name: "description", content: "A five-level cybersecurity treasure hunt for college students: ciphers, encoding, phishing, hashes and binary." },
      { property: "og:title", content: "CyberQuest — Cybersecurity Treasure Hunt" },
      { property: "og:description", content: "Solve five cybersecurity challenges, climb the leaderboard and unlock the digital treasure." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: Lock, title: "5 sequential levels", text: "Each correct answer unlocks the next vault." },
  { icon: Lightbulb, title: "Hints on demand", text: "Stuck? Reveal a hint for a small point penalty." },
  { icon: Trophy, title: "Live leaderboard", text: "Compete with classmates for the top spot." },
  { icon: ShieldCheck, title: "Real security skills", text: "Cryptography, phishing, hashing and more." },
];

function Index() {
  return (
    <div className="space-y-16 py-8">
      <section className="text-center">
        <p className="font-mono text-sm text-accent">$ ./start_hunt --mode=treasure</p>
        <h1 className="mt-4 text-5xl font-bold tracking-tight md:text-7xl">
          Cyber<span className="text-primary text-glow">Quest</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Crack the codes. Unlock the treasure.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="glow">
            <Link to="/register"><KeyRound /> Start the hunt</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/rules">Read the rules</Link>
          </Button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div key={f.title} className="panel p-5">
            <f.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-3 font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
      <section className="panel mx-auto max-w-2xl p-6 font-mono text-sm">
        <p className="text-success">[ok] connection established</p>
        <p className="text-muted-foreground">[..] 5 encrypted vaults detected</p>
        <p className="text-muted-foreground">[..] awaiting operator credentials_</p>
      </section>
    </div>
  );
}
