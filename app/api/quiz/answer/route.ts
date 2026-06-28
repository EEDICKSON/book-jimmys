// app/api/quiz/answer/route.ts
// Reveals the correct answer for one question
// Only called AFTER the player has already selected an answer

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const questionId = request.nextUrl.searchParams.get("id");

  if (!questionId) {
    return NextResponse.json(
      { error: "Question ID required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("questions")
      .select("correct_answer")
      .eq("id", questionId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ correct_answer: data.correct_answer });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
