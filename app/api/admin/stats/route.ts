// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  try {
    const supabase = getAdminClient();
    const weekNumber = getCurrentWeekNumber();

    const [users, questions, scores, hallOfFame] = await Promise.all([
      supabase.from("users").select("id", { count: "exact" }),
      supabase
        .from("questions")
        .select("id", { count: "exact" })
        .eq("week_number", weekNumber),
      supabase
        .from("scores")
        .select("id, score", { count: "exact" })
        .eq("week_number", weekNumber),
      supabase.from("hall_of_fame").select("id", { count: "exact" }),
    ]);

    const avgScore =
      scores.data && scores.data.length > 0
        ? Math.round(
            scores.data.reduce((sum, s) => sum + s.score, 0) /
              scores.data.length,
          )
        : 0;

    return NextResponse.json({
      totalUsers: users.count ?? 0,
      totalQuestions: questions.count ?? 0,
      weeklyPlays: scores.count ?? 0,
      totalChampions: hallOfFame.count ?? 0,
      averageScore: avgScore,
      weekNumber,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
