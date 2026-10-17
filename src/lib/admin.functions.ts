import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isOnline } from "@/lib/monitoring";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const adminListChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("challenges")
      .select("id, level, title, category, description, puzzle, hint, points, hint_penalty, active")
      .order("level");
    if (error) throw new Error(error.message);
    return data;
  });

const challengeSchema = z.object({
  id: z.string().uuid().optional(),
  level: z.number().int().min(1).max(100),
  title: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(50),
  description: z.string().trim().min(1).max(2000),
  puzzle: z.string().trim().min(1).max(2000),
  hint: z.string().trim().min(1).max(1000),
  points: z.number().int().min(0).max(10000),
  hint_penalty: z.number().int().min(0).max(10000),
  active: z.boolean(),
  answer: z.string().trim().max(200).optional(),
});

export const adminSaveChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => challengeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { id, answer, ...fields } = data;
    const row: typeof fields & { answer_hash?: string } = { ...fields };
    if (answer) row.answer_hash = await sha256(answer.toLowerCase());
    if (id) {
      const { error } = await context.supabase.from("challenges").update(row).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      if (!answer || !row.answer_hash) throw new Error("An answer is required for new challenges.");
      const { error } = await context.supabase.from("challenges").insert({ ...row, answer_hash: row.answer_hash });
      if (error) throw new Error(error.code === "23505" ? "That level number is already used." : error.message);
    }
    return { ok: true };
  });

export const adminDeleteChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("challenges").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const [p, s, c, sub, hints, settings] = await Promise.all([
      sb
        .from("participants")
        .select(
          "id, display_name, score, current_level, completed_at, created_at, started_at, last_seen_at, session_started_at, last_logout_at, hints_used",
        )
        .order("score", { ascending: false }),
      sb.from("solves").select("participant_id, challenge_id"),
      sb.from("challenges").select("id, level, title").order("level"),
      sb.from("submissions").select("participant_id, challenge_id, correct"),
      sb.from("hint_usage").select("participant_id, challenge_id"),
      sb.from("competition_settings").select("duration_minutes, started_at").maybeSingle(),
    ]);
    for (const result of [p, s, c, sub, hints, settings]) {
      if (result.error) throw new Error(result.error.message);
    }
    const now = Date.now();
    const duration = settings.data?.duration_minutes ?? null;
    const globalStart = settings.data?.started_at ?? null;
    const levelTitle = new Map((c.data ?? []).map((ch) => [ch.level, ch.title]));

    const participants = (p.data ?? []).map((x) => {
      const subs = (sub.data ?? []).filter((v) => v.participant_id === x.id);
      const solvedCount = (s.data ?? []).filter((v) => v.participant_id === x.id).length;
      const online = isOnline(x.last_seen_at, x.last_logout_at, now);
      const startRef = globalStart ?? x.started_at;
      const deadline = duration && startRef ? new Date(startRef).getTime() + duration * 60_000 : null;
      const remainingMs = deadline ? Math.max(0, deadline - now) : null;
      const timedOut = !!deadline && !x.completed_at && now > deadline;
      const status: "not_started" | "participating" | "completed" | "timed_out" = x.completed_at
        ? "completed"
        : timedOut
          ? "timed_out"
          : x.started_at || subs.length
            ? "participating"
            : "not_started";
      return {
        ...x,
        online,
        status,
        remainingMs,
        solvedCount,
        correctCount: subs.filter((v) => v.correct).length,
        wrongCount: subs.filter((v) => !v.correct).length,
        hintCount: (hints.data ?? []).filter((v) => v.participant_id === x.id).length,
        currentTitle: levelTitle.get(x.current_level) ?? null,
      };
    });

    const challenges = (c.data ?? []).map((ch) => {
      const subs = (sub.data ?? []).filter((x) => x.challenge_id === ch.id);
      return {
        ...ch,
        solves: (s.data ?? []).filter((x) => x.challenge_id === ch.id).length,
        attempts: subs.length,
        wrong: subs.filter((x) => !x.correct).length,
      };
    });

    return {
      participants,
      challenges,
      settings: { duration_minutes: duration, started_at: globalStart },
      totals: {
        participants: participants.length,
        online: participants.filter((x) => x.online).length,
        offline: participants.filter((x) => !x.online).length,
        notStarted: participants.filter((x) => x.status === "not_started").length,
        participating: participants.filter((x) => x.status === "participating").length,
        completed: participants.filter((x) => x.status === "completed").length,
        timedOut: participants.filter((x) => x.status === "timed_out").length,
        submissions: sub.data?.length ?? 0,
        correct: (sub.data ?? []).filter((x) => x.correct).length,
        wrong: (sub.data ?? []).filter((x) => !x.correct).length,
        hints: hints.data?.length ?? 0,
      },
    };
  });

export const adminActivityLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        search: z.string().trim().max(100).optional(),
        participantId: z.string().uuid().optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("activity_log")
      .select("id, participant_id, display_name, event_type, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.participantId) q = q.eq("participant_id", data.participantId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const search = data.search?.toLowerCase();
    return (rows ?? []).filter(row => !search || [row.display_name, row.detail, row.event_type].some(value => value.toLowerCase().includes(search)));
  });

export const adminParticipantAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), action: z.enum(["reset", "delete"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.action === "delete") {
      const { error } = await sb.from("participants").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      await sb.from("solves").delete().eq("participant_id", data.id);
      await sb.from("hint_usage").delete().eq("participant_id", data.id);
      await sb.from("submissions").delete().eq("participant_id", data.id);
      const { error } = await sb
        .from("participants")
        .update({ score: 0, current_level: 1, completed_at: null, started_at: null, hints_used: 0 })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
