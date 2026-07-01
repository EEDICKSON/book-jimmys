// app/api/admin/reset/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

async function verifyAdmin() {
  try {
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return null;
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim());
    return adminEmails.includes(user.email || "") ? user : null;
  } catch {
    return null;
  }
}

export async function POST() {
  try {
    const user = await verifyAdmin();
    if (!user)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

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
        message: "No scores this week — no winner crowned",
        weekNumber,
      });
    }

    // Get winner profile including county
    const { data: winner } = await supabase
      .from("users")
      .select("nickname, county")
      .eq("id", topScore.user_id)
      .single();

    if (!winner) throw new Error("Winner not found");

    // Save to Hall of Fame
    await supabase.from("hall_of_fame").insert({
      user_id: topScore.user_id,
      nickname: winner.nickname,
      score: topScore.score,
      week_number: weekNumber,
      crowned_at: new Date().toISOString(),
    });

    // Reset scores
    await supabase.from("scores").delete().eq("week_number", weekNumber);

    return NextResponse.json({
      success: true,
      message: "Weekly reset complete",
      winner: winner.nickname,
      score: topScore.score,
      timeTaken: topScore.time_taken_secs,
      county: winner.county,
      weekNumber,
      crowned_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
