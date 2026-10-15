import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      if (!answer) throw new Error("An answer is required for new challenges.");
      const { error } = await context.supabase.from("challenges").insert({ ...row, answer_hash: row.answer_hash! });
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
    const [p, s, c, sub] = await Promise.all([
      sb.from("participants").select("id, display_name, score, current_level, completed_at, created_at").order("score", { ascending: false }),
      sb.from("solves").select("participant_id, challenge_id"),
      sb.from("challenges").select("id, level, title").order("level"),
      sb.from("submissions").select("challenge_id, correct"),
    ]);
    if (p.error) throw new Error(p.error.message);
    const participants = p.data ?? [];
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
      totals: {
        participants: participants.length,
        completed: participants.filter((x) => x.completed_at).length,
        submissions: sub.data?.length ?? 0,
      },
    };
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
        .update({ score: 0, current_level: 1, completed_at: null })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
