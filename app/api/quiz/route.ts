// app/api/quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const weekNumber = getCurrentWeekNumber();
    const category = request.nextUrl.searchParams.get("category") || "general";

    // Fetch questions for this week and category
    const { data: allQuestions, error } = await supabase
      .from("questions")
      .select("*")
      .eq("week_number", weekNumber)
      .eq("category", category);

    if (error) throw error;

    // Fallback: if no questions for this category, try general
    let questions = allQuestions ?? [];
    if (questions.length === 0 && category !== "general") {
      const { data: fallback } = await supabase
        .from("questions")
        .select("*")
        .eq("week_number", weekNumber)
        .eq("category", "general");
      questions = fallback ?? [];
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: `No questions available for week ${weekNumber}` },
        { status: 404 },
      );
    }

    // Shuffle and pick 10
    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, 10);

    // Strip correct_answer before sending to browser
    const safeQuestions = shuffled.map(({ correct_answer, ...rest }) => rest);

    return NextResponse.json({
      questions: safeQuestions,
      weekNumber,
      category,
    });
  } catch (error) {
    console.error("Quiz fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load questions" },
      { status: 500 },
    );
  }
}
