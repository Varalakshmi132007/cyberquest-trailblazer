<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Participants have no login: a random token in localStorage is hashed server-side; all participant reads/writes go through server functions in src/lib/hunt.functions.ts using the admin client. Why: answers/hints must never reach the browser.
- Challenge answers are stored only as SHA-256 of the lowercased trimmed answer. Why: no plaintext answers in the database.
- Admins use email auth + user_roles/has_role; admin server functions in src/lib/admin.functions.ts rely on RLS "admin all" policies. First signed-in account can claim admin via claim_first_admin().
- Live monitoring uses token-verified participant heartbeats and persisted activity events, with authenticated admin polling; this preserves browser-based participation without exposing challenge secrets.
- Account emails return to the public /auth/callback route on the published site, with shared auth-flow helpers and standard Cloud Auth APIs; verification and recovery remain in the existing account system.
