// app/api/quiz/route.ts
// This is a SERVER-SIDE API route
// The browser calls this URL to get questions
// The player never sees this code — it runs on the server

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const weekNumber = getCurrentWeekNumber();

    // Fetch this week's questions from the database
    const { data: questions, error } = await supabase
      .from("questions")
      .select("*")
      .eq("week_number", weekNumber) // Only this week's questions
      .limit(5); // Max 5 questions per quiz

    if (error) throw error;

    // If no questions exist for this week, return a helpful message
    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: `No questions available for week ${weekNumber}` },
        { status: 404 },
      );
    }

    // IMPORTANT SECURITY STEP:
    // Remove the correct_answer before sending to the browser
    // If we sent it, players could cheat by reading the network tab
    const safeQuestions = questions.map(({ correct_answer, ...rest }) => rest);
    // The ...rest spread = "everything except correct_answer"

    return NextResponse.json({ questions: safeQuestions, weekNumber });
  } catch (error) {
    console.error("Quiz fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load questions" },
      { status: 500 },
    );
  }
}
