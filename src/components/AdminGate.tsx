import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { AdminTabs } from "./SiteNav";

export function AdminGate({ children }: { children: ReactNode }) {
  const { session, isAdmin, loading, setIsAdmin } = useAdmin();
  const navigate = useNavigate();
  if (loading) return <p className="text-center font-mono text-muted-foreground">Verifying clearance…</p>;
  if (!session)
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <p>Admin access requires sign-in.</p>
        <Button asChild className="mt-4"><Link to="/admin/login">Admin login</Link></Button>
      </div>
    );
  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/admin/login" }); };
  if (!isAdmin)
    return (
      <div className="panel mx-auto max-w-md p-8 text-center">
        <p>Your account ({session.user.email}) is not an administrator.</p>
        <p className="mt-2 text-sm text-muted-foreground">If no admin exists yet, the first account can claim the role.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={async () => {
            const { data } = await supabase.rpc("claim_first_admin");
            if (data) { setIsAdmin(true); toast.success("You are now the administrator."); }
            else toast.error("An administrator already exists.");
          }}>Claim admin</Button>
          <Button variant="outline" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-xs text-accent">admin · {session.user.email}</p>
        <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
