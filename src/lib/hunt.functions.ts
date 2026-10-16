import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const normalize = (s: string) => s.trim().toLowerCase();
async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}
async function getParticipant(token: string) {
  const db = await admin();
  const { data } = await db
    .from("participants")
    .select("id, display_name, score, current_level, completed_at, created_at")
    .eq("token_hash", await sha256(token))
    .maybeSingle();
  if (!data) throw new Error("Session not found. Please register again.");
  return data;
}
const tokenSchema = z.object({ token: z.string().min(10).max(200) });

type Db = Awaited<ReturnType<typeof admin>>;
async function log(db: Db, p: { id: string; display_name: string }, event_type: string, detail = "") {
  await db.from("activity_log").insert({
    participant_id: p.id,
    display_name: p.display_name,
    event_type,
    detail,
  });
}
async function touch(db: Db, id: string) {
  await db.from("participants").update({ last_seen_at: new Date().toISOString() }).eq("id", id);
}

export const registerParticipant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        displayName: z
          .string()
          .trim()
          .min(3, "Name must be at least 3 characters")
          .max(24, "Name must be at most 24 characters")
          .regex(/^[A-Za-z0-9_\- ]+$/, "Only letters, numbers, spaces, - and _"),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const token = crypto.randomUUID() + crypto.randomUUID();
    const now = new Date().toISOString();
    const { data: row, error } = await db
      .from("participants")
      .insert({
        display_name: data.displayName,
        token_hash: await sha256(token),
        last_seen_at: now,
        session_started_at: now,
      })
      .select("id, display_name")
      .single();
    if (error || !row) {
      if (error?.code === "23505") throw new Error("That display name is taken.");
      throw new Error("Could not register. Try again.");
    }
    await log(db, row, "register", "Registered and joined the hunt");
    return { token };
  });

export const heartbeat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const p = await getParticipant(data.token);
    const db = await admin();
    await touch(db, p.id);
    return { ok: true };
  });

export const endSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const p = await getParticipant(data.token);
    const db = await admin();
    const now = new Date().toISOString();
    await db.from("participants").update({ last_logout_at: now, last_seen_at: now }).eq("id", p.id);
    await log(db, p, "logout", "Signed out");
    return { ok: true };
  });

export const getProgress = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const p = await getParticipant(data.token);
    const db = await admin();
    await touch(db, p.id);
    const [{ data: ch }, { data: solves }, { data: hints }] = await Promise.all([
      db.from("challenges").select("id, level, title, category, points").eq("active", true).order("level"),
      db.from("solves").select("challenge_id, points").eq("participant_id", p.id),
      db.from("hint_usage").select("challenge_id").eq("participant_id", p.id),
    ]);
    const solved = new Set((solves ?? []).map((s) => s.challenge_id));
    const hinted = new Set((hints ?? []).map((h) => h.challenge_id));
    return {
      participant: p,
      challenges: (ch ?? []).map((c) => ({
        ...c,
        solved: solved.has(c.id),
        hintUsed: hinted.has(c.id),
        unlocked: c.level <= p.current_level,
      })),
    };
  });

export const getChallenge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.extend({ level: z.number().int().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const p = await getParticipant(data.token);
    if (data.level > p.current_level) throw new Error("This level is still locked.");
    const db = await admin();
    const { data: c } = await db
      .from("challenges")
      .select("id, level, title, category, description, puzzle, hint, points, hint_penalty")
      .eq("level", data.level)
      .eq("active", true)
      .maybeSingle();
    if (!c) throw new Error("Challenge not found.");
    const [{ data: hint }, { data: solve }, { count }] = await Promise.all([
      db.from("hint_usage").select("challenge_id").eq("participant_id", p.id).eq("challenge_id", c.id).maybeSingle(),
      db.from("solves").select("points").eq("participant_id", p.id).eq("challenge_id", c.id).maybeSingle(),
      db.from("challenges").select("id", { count: "exact", head: true }).eq("active", true),
    ]);
    const { hint: hintText, ...rest } = c;
    return {
      challenge: { ...rest, hint: hint ? hintText : null },
      solved: !!solve,
      totalLevels: count ?? 0,
      score: p.score,
    };
  });

export const requestHint = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => tokenSchema.extend({ level: z.number().int() }).parse(d))
  .handler(async ({ data }) => {
    const p = await getParticipant(data.token);
    if (data.level > p.current_level) throw new Error("Locked.");
    const db = await admin();
    const { data: c } = await db.from("challenges").select("id, hint").eq("level", data.level).single();
    if (!c) throw new Error("Not found");
    await db.from("hint_usage").upsert({ participant_id: p.id, challenge_id: c.id }, { ignoreDuplicates: true });
    return { hint: c.hint };
  });

export const submitAnswer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    tokenSchema.extend({ level: z.number().int(), answer: z.string().trim().min(1).max(200) }).parse(d),
  )
  .handler(async ({ data }) => {
    const p = await getParticipant(data.token);
    if (data.level > p.current_level) throw new Error("This level is locked.");
    const db = await admin();
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count: recent } = await db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("participant_id", p.id)
      .gte("created_at", since);
    if ((recent ?? 0) >= 10) throw new Error("Too many attempts. Wait a minute and try again.");

    const { data: c } = await db
      .from("challenges")
      .select("id, level, answer_hash, points, hint_penalty")
      .eq("level", data.level)
      .eq("active", true)
      .single();
    if (!c) throw new Error("Challenge not found.");
    const { data: already } = await db
      .from("solves").select("points").eq("participant_id", p.id).eq("challenge_id", c.id).maybeSingle();
    if (already) return { correct: true, alreadySolved: true, completed: !!p.completed_at, points: 0 };

    const correct = (await sha256(normalize(data.answer))) === c.answer_hash;
    await db.from("submissions").insert({ participant_id: p.id, challenge_id: c.id, correct });
    if (!correct) return { correct: false, alreadySolved: false, completed: false, points: 0 };

    const { data: hint } = await db
      .from("hint_usage").select("challenge_id").eq("participant_id", p.id).eq("challenge_id", c.id).maybeSingle();
    const pts = Math.max(0, c.points - (hint ? c.hint_penalty : 0));
    await db.from("solves").insert({ participant_id: p.id, challenge_id: c.id, points: pts });

    const { data: next } = await db
      .from("challenges").select("level").eq("active", true).gt("level", c.level).order("level").limit(1).maybeSingle();
    const completed = !next;
    await db
      .from("participants")
      .update({
        score: p.score + pts,
        current_level: next ? next.level : c.level,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", p.id);
    return { correct: true, alreadySolved: false, completed, points: pts, nextLevel: next?.level ?? null };
  });

export const getLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data } = await db
    .from("participants")
    .select("display_name, score, current_level, completed_at, created_at")
    .order("score", { ascending: false })
    .order("completed_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(100);
  return data ?? [];
});
