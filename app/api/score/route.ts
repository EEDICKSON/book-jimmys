// app/api/score/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import {
  calculateTotalScore,
  calculateTotalTime,
  getCurrentWeekNumber,
  type AnsweredQuestion,
} from "@/lib/quiz-logic";
import {
  calculateQuizXp,
  calculateNewStreak,
  getLevelFromXp,
} from "@/lib/xp-system";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { answers }: { answers: AnsweredQuestion[] } = await request.json();
    const weekNumber = getCurrentWeekNumber();

    // Check: already played this week?
    const { data: existingScore } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_number", weekNumber)
      .single();

    if (existingScore) {
      return NextResponse.json(
        { error: "You have already played this week" },
        { status: 409 },
      );
    }

    // Verify answers server-side
    const questionIds = answers.map((a) => a.questionId);
    const { data: realQuestions, error: qError } = await supabase
      .from("questions")
      .select("id, correct_answer")
      .in("id", questionIds);

    if (qError || !realQuestions) throw qError;

    const verifiedAnswers: AnsweredQuestion[] = answers.map((answer) => {
      const real = realQuestions.find((q) => q.id === answer.questionId);
      return {
        ...answer,
        isCorrect: real?.correct_answer === answer.selectedAnswer,
      };
    });

    const totalScore = calculateTotalScore(verifiedAnswers);
    const totalTimeSecs = calculateTotalTime(verifiedAnswers);
    const correctCount = verifiedAnswers.filter((a) => a.isCorrect).length;

    // Save score
    const { error: saveError } = await supabase.from("scores").insert({
      user_id: user.id,
      score: totalScore,
      time_taken_secs: totalTimeSecs,
      week_number: weekNumber,
    });

    if (saveError) throw saveError;

    // Get rank for XP calculation
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: allScores } = await adminSupabase
      .from("scores")
      .select("score, time_taken_secs")
      .eq("week_number", weekNumber)
      .order("score", { ascending: false })
      .order("time_taken_secs", { ascending: true });

    const rank =
      (allScores?.findIndex(
        (s) => s.score === totalScore && s.time_taken_secs === totalTimeSecs,
      ) ?? 0) + 1;

    // Get current user stats for streak calculation
    const { data: userData } = await adminSupabase
      .from("users")
      .select("xp, level, streak, last_played")
      .eq("id", user.id)
      .single();

    if (userData) {
      const newStreak = calculateNewStreak(
        userData.streak,
        userData.last_played,
        weekNumber,
      );
      const { total: xpEarned, breakdown } = calculateQuizXp(
        correctCount,
        rank,
        newStreak,
      );
      const newXp = userData.xp + xpEarned;
      const newLevel = getLevelFromXp(newXp).level;

      // Update user XP, level, streak
      await adminSupabase
        .from("users")
        .update({
          xp: newXp,
          level: newLevel,
          streak: newStreak,
          last_played: weekNumber,
        })
        .eq("id", user.id);

      // Log XP transactions
      await adminSupabase.from("xp_log").insert(
        breakdown.map((item) => ({
          user_id: user.id,
          amount: item.amount,
          reason: item.reason,
          week_number: weekNumber,
        })),
      );
    }

    return NextResponse.json({
      score: totalScore,
      timeTaken: totalTimeSecs,
      weekNumber,
      rank,
      correctAnswers: correctCount,
      answers: verifiedAnswers,
    });
  } catch (error) {
    console.error("Score save error:", error);
    return NextResponse.json(
      { error: "Failed to save score" },
      { status: 500 },
    );
  }
}
