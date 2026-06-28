// app/api/quiz/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const weekNumber = getCurrentWeekNumber();

    // Fetch ALL questions for this week
    const { data: allQuestions, error } = await supabase
      .from("questions")
      .select("*")
      .eq("week_number", weekNumber);

    if (error) throw error;

    if (!allQuestions || allQuestions.length === 0) {
      return NextResponse.json(
        { error: `No questions available for week ${weekNumber}` },
        { status: 404 },
      );
    }

    // Shuffle randomly and pick 5
    // Every player gets a different mix — keeps the game fresh
    const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 10);

    // Strip correct_answer before sending to browser
    const safeQuestions = shuffled.map(({ correct_answer, ...rest }) => rest);

    return NextResponse.json({ questions: safeQuestions, weekNumber });
  } catch (error) {
    console.error("Quiz fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load questions" },
      { status: 500 },
    );
  }
}
