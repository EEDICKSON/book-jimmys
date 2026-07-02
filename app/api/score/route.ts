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

    const {
      answers,
      category,
    }: { answers: AnsweredQuestion[]; category?: string } =
      await request.json();
    const weekNumber = getCurrentWeekNumber();

    // Count how many times this player has played this week
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: previousAttempts } = await adminSupabase
      .from("scores")
      .select("id, attempt_number")
      .eq("user_id", user.id)
      .eq("week_number", weekNumber)
      .order("attempt_number", { ascending: false })
      .limit(1);

    const attemptNumber =
      previousAttempts && previousAttempts.length > 0
        ? previousAttempts[0].attempt_number + 1
        : 1;

    const isFirstAttempt = attemptNumber === 1;

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

    // Always save the score — even repeat attempts
    const { error: saveError } = await adminSupabase.from("scores").insert({
      user_id: user.id,
      score: totalScore,
      time_taken_secs: totalTimeSecs,
      week_number: weekNumber,
      category: category || "general",
      attempt_number: attemptNumber,
    });

    if (saveError) throw saveError;

    // Only award XP and update leaderboard rank on first attempt
    let rank = null;
    if (isFirstAttempt) {
      const { data: allScores } = await adminSupabase
        .from("scores")
        .select("score, time_taken_secs, attempt_number")
        .eq("week_number", weekNumber)
        .eq("attempt_number", 1) // Only count first attempts for ranking
        .order("score", { ascending: false })
        .order("time_taken_secs", { ascending: true });

      rank =
        (allScores?.findIndex(
          (s) => s.score === totalScore && s.time_taken_secs === totalTimeSecs,
        ) ?? 0) + 1;

      // Get current user stats for streak
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

        await adminSupabase
          .from("users")
          .update({
            xp: newXp,
            level: newLevel,
            streak: newStreak,
            last_played: weekNumber,
          })
          .eq("id", user.id);

        await adminSupabase.from("xp_log").insert(
          breakdown.map((item) => ({
            user_id: user.id,
            amount: item.amount,
            reason: item.reason,
            week_number: weekNumber,
          })),
        );
      }
    }

    return NextResponse.json({
      score: totalScore,
      timeTaken: totalTimeSecs,
      weekNumber,
      rank,
      correctAnswers: correctCount,
      attemptNumber,
      isFirstAttempt,
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
