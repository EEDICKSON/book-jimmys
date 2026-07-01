// app/api/xp/route.ts
// Awards XP after a quiz attempt
// Called by the score API after saving the score

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  calculateQuizXp,
  calculateNewStreak,
  getLevelFromXp,
} from "@/lib/xp-system";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { correctAnswers, rank } = await request.json();
    const weekNumber = getCurrentWeekNumber();

    // Service role to update user stats
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Get current user stats
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("xp, level, streak, last_played")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate new streak
    const newStreak = calculateNewStreak(
      userData.streak,
      userData.last_played,
      weekNumber,
    );

    // Calculate XP earned
    const { total: xpEarned, breakdown } = calculateQuizXp(
      correctAnswers,
      rank,
      newStreak,
    );

    const newXp = userData.xp + xpEarned;
    const newLevel = getLevelFromXp(newXp).level;
    const leveledUp = newLevel > userData.level;

    // Update user stats
    const { error: updateError } = await supabase
      .from("users")
      .update({
        xp: newXp,
        level: newLevel,
        streak: newStreak,
        last_played: weekNumber,
      })
      .eq("id", user.id);

    if (updateError) throw updateError;

    // Log each XP transaction
    const xpLogEntries = breakdown.map((item) => ({
      user_id: user.id,
      amount: item.amount,
      reason: item.reason,
      week_number: weekNumber,
    }));

    await supabase.from("xp_log").insert(xpLogEntries);

    return NextResponse.json({
      xpEarned,
      newXp,
      newLevel,
      newStreak,
      leveledUp,
      breakdown,
    });
  } catch (error) {
    console.error("XP award error:", error);
    return NextResponse.json({ error: "Failed to award XP" }, { status: 500 });
  }
}
