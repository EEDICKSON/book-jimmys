// app/api/profile/route.ts
// Returns full player profile data

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getLevelFromXp,
  getLevelProgress,
  getStreakMessage,
} from "@/lib/xp-system";

export async function GET(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, nickname, xp, level, streak, last_played, created_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch all scores for this user
    const { data: scores } = await supabase
      .from("scores")
      .select("score, time_taken_secs, week_number, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch XP history (last 10 transactions)
    const { data: xpLog } = await supabase
      .from("xp_log")
      .select("amount, reason, week_number, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch hall of fame entries for this user
    const { data: champions } = await supabase
      .from("hall_of_fame")
      .select("score, week_number, crowned_at")
      .eq("user_id", user.id)
      .order("crowned_at", { ascending: false });

    // Calculate stats
    const totalPlays = scores?.length ?? 0;
    const bestScore = scores?.length
      ? Math.max(...scores.map((s) => s.score))
      : 0;
    const averageScore = scores?.length
      ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
      : 0;
    const timesChampion = champions?.length ?? 0;

    const levelProgress = getLevelProgress(profile.xp);
    const streakMessage = getStreakMessage(profile.streak);

    return NextResponse.json({
      profile: {
        nickname: profile.nickname,
        xp: profile.xp,
        level: profile.level,
        streak: profile.streak,
        last_played: profile.last_played,
        member_since: profile.created_at,
      },
      stats: {
        totalPlays,
        bestScore,
        averageScore,
        timesChampion,
      },
      levelProgress,
      streakMessage,
      recentScores: scores?.slice(0, 5) ?? [],
      xpLog: xpLog ?? [],
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 },
    );
  }
}
