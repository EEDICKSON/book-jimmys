// app/api/leaderboard/route.ts
// Fetches this week's top scores joined with user nicknames
// Public endpoint — no login required to view the leaderboard

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const weekNumber = getCurrentWeekNumber();

    // Join scores with users to get the nickname
    // This is a SQL JOIN — we get data from two tables in one query
    const { data: scores, error } = await supabase
      .from("scores")
      .select(
        `
        id,
        score,
        time_taken_secs,
        week_number,
        created_at,
        users (
          nickname
        )
      `,
      )
      .eq("week_number", weekNumber)
      .order("score", { ascending: false }) // Highest score first
      .order("time_taken_secs", { ascending: true }) // Fastest time as tiebreaker
      .limit(10); // Top 10 only

    if (error) throw error;

    // Shape the data for the frontend
    const leaderboard =
      scores?.map((entry, index) => ({
        rank: index + 1,
        nickname: (entry.users as any)?.nickname ?? "Unknown Player",
        score: entry.score,
        timeTakenSecs: entry.time_taken_secs,
        weekNumber: entry.week_number,
      })) ?? [];

    return NextResponse.json({ leaderboard, weekNumber });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 },
    );
  }
}
