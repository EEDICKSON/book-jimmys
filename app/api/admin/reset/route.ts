// app/api/admin/reset/route.ts
// Admin-only manual weekly reset
// Protected by checking the user's email server-side

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

export async function POST() {
  try {
    // Verify the caller is an admin
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim());
    if (!adminEmails.includes(user.email || "")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Use service role for the actual reset
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const weekNumber = getCurrentWeekNumber();

    // Find this week's winner
    const { data: topScore, error: scoreError } = await supabase
      .from("scores")
      .select("score, time_taken_secs, user_id, week_number")
      .eq("week_number", weekNumber)
      .order("score", { ascending: false })
      .order("time_taken_secs", { ascending: true })
      .limit(1)
      .single();

    if (scoreError || !topScore) {
      return NextResponse.json({
        message: "No scores found for this week — no winner crowned",
        weekNumber,
      });
    }

    // Get winner nickname
    const { data: winner, error: userError } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", topScore.user_id)
      .single();

    if (userError || !winner) {
      throw new Error("Could not find winner profile");
    }

    // Save to Hall of Fame
    const { error: fameError } = await supabase.from("hall_of_fame").insert({
      user_id: topScore.user_id,
      nickname: winner.nickname,
      score: topScore.score,
      week_number: weekNumber,
      crowned_at: new Date().toISOString(),
    });

    if (fameError) throw fameError;

    // Reset scores
    const { error: deleteError } = await supabase
      .from("scores")
      .delete()
      .eq("week_number", weekNumber);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: "Weekly reset complete",
      winner: winner.nickname,
      score: topScore.score,
      weekNumber,
    });
  } catch (error) {
    console.error("Admin reset error:", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
