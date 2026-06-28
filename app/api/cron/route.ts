// app/api/cron/route.ts
// This runs automatically every Friday at 8pm
// It crowns the weekly winner and resets the leaderboard
// SECURITY: Protected by a secret token so only Vercel can call it

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

export async function POST(request: NextRequest) {
  // ── SECURITY CHECK ───────────────────────────────────────
  // Verify this request is coming from Vercel, not a random person
  // who discovered our cron URL and is trying to trigger it manually
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── SERVICE ROLE CLIENT ──────────────────────────────────
  // The cron job needs special power — it must:
  // 1. Read ALL scores (including other users' private data)
  // 2. Delete rows (which RLS normally blocks)
  // The service role key bypasses RLS — use it carefully
  // This key NEVER goes in the browser — server only
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // More powerful than anon key
  );

  const weekNumber = getCurrentWeekNumber();

  try {
    // ── STEP 1: Find this week's winner ──────────────────
    const { data: topScore, error: scoreError } = await supabase
      .from("scores")
      .select(
        `
        score,
        time_taken_secs,
        user_id,
        week_number
      `,
      )
      .eq("week_number", weekNumber)
      .order("score", { ascending: false })
      .order("time_taken_secs", { ascending: true })
      .limit(1)
      .single();

    // If no scores this week — nobody played
    // Exit gracefully without crashing
    if (scoreError || !topScore) {
      return NextResponse.json({
        message: "No scores found for this week — no winner crowned",
        weekNumber,
      });
    }

    // ── STEP 2: Get the winner's nickname ────────────────
    const { data: winner, error: userError } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", topScore.user_id)
      .single();

    if (userError || !winner) {
      throw new Error("Could not find winner profile");
    }

    // ── STEP 3: Save to Hall of Fame ─────────────────────
    // We snapshot the nickname here — even if they change it later,
    // the Hall of Fame will always show what they were called when they won
    const { error: fameError } = await supabase.from("hall_of_fame").insert({
      user_id: topScore.user_id,
      nickname: winner.nickname, // Snapshot — not a live reference
      score: topScore.score,
      week_number: weekNumber,
      crowned_at: new Date().toISOString(),
    });

    if (fameError) throw fameError;

    // ── STEP 4: Reset the leaderboard ───────────────────
    // Delete all scores for this week
    // Next week starts fresh — everyone gets a new chance
    const { error: deleteError } = await supabase
      .from("scores")
      .delete()
      .eq("week_number", weekNumber);

    if (deleteError) throw deleteError;

    // ── SUCCESS ──────────────────────────────────────────
    return NextResponse.json({
      message: "Weekly reset complete",
      winner: winner.nickname,
      score: topScore.score,
      weekNumber,
      crowningAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Weekly reset failed", details: String(error) },
      { status: 500 },
    );
  }
}
