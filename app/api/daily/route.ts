// app/api/daily/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// GET — fetch today's challenge and user completion status
export async function GET() {
  try {
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const supabase = getAdminClient();
    const today = getTodayDate();

    // Get today's challenge
    const { data: challenge, error } = await supabase
      .from("daily_challenges")
      .select(
        "id, question_text, option_a, option_b, option_c, option_d, category, challenge_date",
      )
      .eq("challenge_date", today)
      .single();

    if (error || !challenge) {
      return NextResponse.json(
        { error: "No daily challenge available today" },
        { status: 404 },
      );
    }

    // Check if the logged-in user has already completed today
    let completed = false;
    let isCorrect = null;
    let dailyStreak = 0;

    if (user) {
      const { data: completion } = await supabase
        .from("daily_completions")
        .select("is_correct")
        .eq("user_id", user.id)
        .eq("challenge_date", today)
        .single();

      if (completion) {
        completed = true;
        isCorrect = completion.is_correct;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("daily_streak")
        .eq("id", user.id)
        .single();

      dailyStreak = profile?.daily_streak ?? 0;
    }

    return NextResponse.json({
      challenge,
      completed,
      isCorrect,
      dailyStreak,
      today,
    });
  } catch (error) {
    console.error("Daily challenge error:", error);
    return NextResponse.json(
      { error: "Failed to load challenge" },
      { status: 500 },
    );
  }
}

// POST — submit answer for today's challenge
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

    const { challengeId, selectedAnswer, timeTakenSecs } = await request.json();
    const supabase = getAdminClient();
    const today = getTodayDate();

    // Check not already completed
    const { data: existing } = await supabase
      .from("daily_completions")
      .select("id")
      .eq("user_id", user.id)
      .eq("challenge_date", today)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Already completed today" },
        { status: 409 },
      );
    }

    // Get the real correct answer server-side
    const { data: challenge, error: challengeError } = await supabase
      .from("daily_challenges")
      .select("correct_answer")
      .eq("id", challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    const isCorrect = selectedAnswer === challenge.correct_answer;

    // Save completion
    await supabase.from("daily_completions").insert({
      user_id: user.id,
      challenge_date: today,
      is_correct: isCorrect,
      time_taken_secs: timeTakenSecs,
    });

    // Update daily streak
    const { data: profile } = await supabase
      .from("users")
      .select("daily_streak, last_daily_date")
      .eq("id", user.id)
      .single();

    let newStreak = 1;
    if (profile?.last_daily_date) {
      const lastDate = new Date(profile.last_daily_date);
      const todayDate = new Date(today);
      const diffDays = Math.round(
        (todayDate.getTime() - lastDate.getTime()) / 86400000,
      );
      if (diffDays === 1) newStreak = (profile.daily_streak || 0) + 1;
      else if (diffDays === 0) newStreak = profile.daily_streak || 1;
    }

    // Award XP
    const xpEarned = isCorrect ? 30 : 10;
    const { data: currentUser } = await supabase
      .from("users")
      .select("xp")
      .eq("id", user.id)
      .single();

    await supabase
      .from("users")
      .update({
        daily_streak: newStreak,
        last_daily_date: today,
        xp: (currentUser?.xp || 0) + xpEarned,
      })
      .eq("id", user.id);

    // Log XP
    await supabase.from("xp_log").insert({
      user_id: user.id,
      amount: xpEarned,
      reason: isCorrect
        ? "Daily challenge — correct!"
        : "Daily challenge — attempted",
      week_number: Math.ceil(
        (new Date().getTime() -
          new Date(new Date().getFullYear(), 0, 1).getTime()) /
          604800000,
      ),
    });

    return NextResponse.json({
      isCorrect,
      correctAnswer: challenge.correct_answer,
      xpEarned,
      dailyStreak: newStreak,
    });
  } catch (error) {
    console.error("Daily submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 },
    );
  }
}
