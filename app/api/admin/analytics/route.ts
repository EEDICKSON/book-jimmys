// app/api/admin/analytics/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

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

export async function GET() {
  try {
    const user = await verifyAdmin();
    if (!user)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const supabase = getAdminClient();
    const weekNumber = getCurrentWeekNumber();
    const today = new Date().toISOString().split("T")[0];

    // Run all queries in parallel for speed
    const [
      scoresData,
      usersData,
      dailyData,
      categoryData,
      countyData,
      hallData,
    ] = await Promise.all([
      // All scores with week number
      supabase
        .from("scores")
        .select("score, week_number, category, created_at"),
      // All users with join date and county
      supabase
        .from("users")
        .select("id, county, created_at, xp, level, streak"),
      // Daily completions
      supabase
        .from("daily_completions")
        .select("is_correct, challenge_date, created_at"),
      // Scores grouped by category this week
      supabase.from("scores").select("category").eq("week_number", weekNumber),
      // Users grouped by county
      supabase.from("users").select("county").not("county", "is", null),
      // Hall of fame entries
      supabase.from("hall_of_fame").select("week_number, score, crowned_at"),
    ]);

    const scores = scoresData.data ?? [];
    const users = usersData.data ?? [];
    const daily = dailyData.data ?? [];
    const categories = categoryData.data ?? [];
    const counties = countyData.data ?? [];
    const hall = hallData.data ?? [];

    // ── WEEKLY PLAYS (last 8 weeks) ──────────────────────
    const weeklyPlays: Record<number, number> = {};
    const weeklyAvgScore: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 8; i++) {
      const w = weekNumber - i;
      weeklyPlays[w] = 0;
      weeklyAvgScore[w] = { total: 0, count: 0 };
    }
    scores.forEach((s) => {
      if (weeklyPlays[s.week_number] !== undefined) {
        weeklyPlays[s.week_number]++;
        weeklyAvgScore[s.week_number].total += s.score;
        weeklyAvgScore[s.week_number].count++;
      }
    });

    const weeklyTrend = Object.entries(weeklyPlays)
      .map(([week, plays]) => {
        const avg = weeklyAvgScore[Number(week)];
        return {
          week: Number(week),
          plays,
          avgScore: avg.count > 0 ? Math.round(avg.total / avg.count) : 0,
        };
      })
      .sort((a, b) => a.week - b.week);

    // ── CATEGORY BREAKDOWN this week ─────────────────────
    const categoryCount: Record<string, number> = {};
    categories.forEach((s) => {
      const cat = s.category || "general";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(categoryCount)
      .map(([category, plays]) => ({ category, plays }))
      .sort((a, b) => b.plays - a.plays);

    // ── COUNTY BREAKDOWN ─────────────────────────────────
    const countyCount: Record<string, number> = {};
    counties.forEach((u) => {
      if (u.county) countyCount[u.county] = (countyCount[u.county] || 0) + 1;
    });
    const countyBreakdown = Object.entries(countyCount)
      .map(([county, players]) => ({ county, players }))
      .sort((a, b) => b.players - a.players)
      .slice(0, 10);

    // ── USER GROWTH (last 8 weeks) ────────────────────────
    const usersByWeek: Record<number, number> = {};
    for (let i = 0; i < 8; i++) usersByWeek[weekNumber - i] = 0;
    users.forEach((u) => {
      const joinDate = new Date(u.created_at);
      const startYear = new Date(joinDate.getFullYear(), 0, 1);
      const joinWeek = Math.ceil(
        ((joinDate.getTime() - startYear.getTime()) / 86400000 +
          startYear.getDay() +
          1) /
          7,
      );
      if (usersByWeek[joinWeek] !== undefined) usersByWeek[joinWeek]++;
    });
    const userGrowth = Object.entries(usersByWeek)
      .map(([week, newUsers]) => ({ week: Number(week), newUsers }))
      .sort((a, b) => a.week - b.week);

    // ── DAILY CHALLENGE STATS ─────────────────────────────
    const totalDailyAttempts = daily.length;
    const correctDaily = daily.filter((d) => d.is_correct).length;
    const dailyAccuracyPct =
      totalDailyAttempts > 0
        ? Math.round((correctDaily / totalDailyAttempts) * 100)
        : 0;
    const todayAttempts = daily.filter(
      (d) => d.challenge_date === today,
    ).length;

    // ── LEVEL DISTRIBUTION ───────────────────────────────
    const levelCount: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
    };
    users.forEach((u) => {
      if (levelCount[u.level] !== undefined) levelCount[u.level]++;
    });
    const levelDistribution = Object.entries(levelCount).map(
      ([level, count]) => ({ level: Number(level), count }),
    );

    // ── STREAK STATS ─────────────────────────────────────
    const streaks = users.map((u) => u.streak).filter((s) => s > 0);
    const avgStreak =
      streaks.length > 0
        ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length)
        : 0;
    const maxStreak = streaks.length > 0 ? Math.max(...streaks) : 0;
    const activeStreakers = streaks.filter((s) => s >= 2).length;

    // ── THIS WEEK SUMMARY ────────────────────────────────
    const thisWeekScores = scores.filter((s) => s.week_number === weekNumber);
    const thisWeekAvg =
      thisWeekScores.length > 0
        ? Math.round(
            thisWeekScores.reduce((s, r) => s + r.score, 0) /
              thisWeekScores.length,
          )
        : 0;
    const lastWeekScores = scores.filter(
      (s) => s.week_number === weekNumber - 1,
    );
    const playGrowthPct =
      lastWeekScores.length > 0
        ? Math.round(
            ((thisWeekScores.length - lastWeekScores.length) /
              lastWeekScores.length) *
              100,
          )
        : 0;

    return NextResponse.json({
      summary: {
        totalUsers: users.length,
        thisWeekPlays: thisWeekScores.length,
        lastWeekPlays: lastWeekScores.length,
        playGrowthPct,
        thisWeekAvgScore: thisWeekAvg,
        totalChampions: hall.length,
        todayDailyPlays: todayAttempts,
        dailyAccuracyPct,
        activeStreakers,
        avgStreak,
        maxStreak,
      },
      weeklyTrend,
      userGrowth,
      categoryBreakdown,
      countyBreakdown,
      levelDistribution,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 },
    );
  }
}
