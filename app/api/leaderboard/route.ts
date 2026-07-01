// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const weekNumber = getCurrentWeekNumber();
    const county = request.nextUrl.searchParams.get("county") || null;
    const category = request.nextUrl.searchParams.get("category") || null;

    // Base query — join scores with users
    let query = supabase
      .from("scores")
      .select(
        `
        id,
        score,
        time_taken_secs,
        week_number,
        category,
        created_at,
        users (
          id,
          nickname,
          county,
          level,
          xp
        )
      `,
      )
      .eq("week_number", weekNumber)
      .order("score", { ascending: false })
      .order("time_taken_secs", { ascending: true })
      .limit(50);

    // Apply category filter if provided
    if (category) {
      query = query.eq("category", category);
    }

    const { data: scores, error } = await query;
    if (error) throw error;

    // Filter by county after fetch (Supabase does not support
    // filtering on joined table columns directly in free tier)
    let filtered = scores ?? [];
    if (county) {
      filtered = filtered.filter((s) => (s.users as any)?.county === county);
    }

    // Take top 10 after filtering
    const top10 = filtered.slice(0, 10);

    const leaderboard = top10.map((entry, index) => ({
      rank: index + 1,
      nickname: (entry.users as any)?.nickname ?? "Unknown",
      county: (entry.users as any)?.county ?? null,
      level: (entry.users as any)?.level ?? 1,
      score: entry.score,
      timeTakenSecs: entry.time_taken_secs,
      category: entry.category,
      weekNumber: entry.week_number,
    }));

    // Get county summary — how many players per county
    const countySummary: Record<string, number> = {};
    (scores ?? []).forEach((s) => {
      const c = (s.users as any)?.county;
      if (c) countySummary[c] = (countySummary[c] || 0) + 1;
    });

    return NextResponse.json({ leaderboard, weekNumber, countySummary });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 },
    );
  }
}
