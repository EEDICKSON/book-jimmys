// app/api/score/route.ts
// Receives the player's answers, validates them SERVER-SIDE
// and saves the score to the database
// This must run on the server — we check answers here, not in the browser

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  calculateTotalScore,
  calculateTotalTime,
  getCurrentWeekNumber,
  type AnsweredQuestion,
} from "@/lib/quiz-logic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check the user is logged in
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the answers the player submitted
    const { answers }: { answers: AnsweredQuestion[] } = await request.json();

    const weekNumber = getCurrentWeekNumber();

    // Check: has this player already played this week?
    const { data: existingScore } = await supabase
      .from("scores")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_number", weekNumber)
      .single();

    if (existingScore) {
      return NextResponse.json(
        { error: "You have already played this week" },
        { status: 409 }, // 409 = Conflict
      );
    }

    // SERVER-SIDE: Verify answers against the real correct answers
    // We fetch the real answers from the database here
    // Players cannot tamper with this — it runs on our server
    const questionIds = answers.map((a) => a.questionId);
    const { data: realQuestions, error: qError } = await supabase
      .from("questions")
      .select("id, correct_answer")
      .in("id", questionIds);

    if (qError || !realQuestions) throw qError;

    // Re-calculate isCorrect using SERVER data, not what the browser sent
    const verifiedAnswers: AnsweredQuestion[] = answers.map((answer) => {
      const realQuestion = realQuestions.find(
        (q) => q.id === answer.questionId,
      );
      const isCorrect = realQuestion?.correct_answer === answer.selectedAnswer;
      return { ...answer, isCorrect };
    });

    // Calculate the final score using our pure function
    const totalScore = calculateTotalScore(verifiedAnswers);
    const totalTimeSecs = calculateTotalTime(verifiedAnswers);

    // Save to the database
    const { error: saveError } = await supabase.from("scores").insert({
      user_id: user.id,
      score: totalScore,
      time_taken_secs: totalTimeSecs,
      week_number: weekNumber,
    });

    if (saveError) throw saveError;

    return NextResponse.json({
      score: totalScore,
      timeTaken: totalTimeSecs,
      weekNumber,
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
