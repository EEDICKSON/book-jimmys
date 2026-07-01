// app/api/admin/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET — fetch all questions for a given week
export async function GET(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const week =
      request.nextUrl.searchParams.get("week") ||
      getCurrentWeekNumber().toString();

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("week_number", parseInt(week))
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ questions: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load questions" },
      { status: 500 },
    );
  }
}

// POST — add a new question
export async function POST(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const body = await request.json();

    const {
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      week_number,
    } = body;

    if (
      !question_text ||
      !option_a ||
      !option_b ||
      !option_c ||
      !option_d ||
      !correct_answer
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    if (!["a", "b", "c", "d"].includes(correct_answer)) {
      return NextResponse.json(
        { error: "Correct answer must be a, b, c, or d" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({
        question_text: question_text.trim(),
        option_a: option_a.trim(),
        option_b: option_b.trim(),
        option_c: option_c.trim(),
        option_d: option_d.trim(),
        correct_answer,
        week_number: week_number || getCurrentWeekNumber(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ question: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to add question" },
      { status: 500 },
    );
  }
}

// DELETE — remove a question
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getAdminClient();
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Question ID required" },
        { status: 400 },
      );
    }

    const { error } = await supabase.from("questions").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 },
    );
  }
}
