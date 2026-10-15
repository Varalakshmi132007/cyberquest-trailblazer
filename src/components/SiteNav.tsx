import { Link } from "@tanstack/react-router";
import { Terminal } from "lucide-react";

const links = [
  { to: "/hunt", label: "Hunt" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/rules", label: "Rules" },
  { to: "/admin", label: "Admin" },
] as const;

export function SiteNav() {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-mono font-bold text-primary">
          <span className="grid h-8 w-8 place-items-center rounded-md border border-primary/50 glow">
            <Terminal className="h-4 w-4" />
          </span>
          CyberQuest
        </Link>
        <div className="flex flex-wrap gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-primary" }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

export function AdminTabs() {
  const tabs = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/challenges", label: "Challenges" },
    { to: "/admin/participants", label: "Participants" },
  ] as const;
  return (
    <div className="mb-6 flex gap-2 border-b pb-2 text-sm">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          activeOptions={{ exact: true }}
          className="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground"
          activeProps={{ className: "bg-secondary text-primary" }}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
