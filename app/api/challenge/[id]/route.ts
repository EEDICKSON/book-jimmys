// app/api/challenge/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = getAdminClient();
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const { data: challenge, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    const isExpired = new Date(challenge.expires_at) < new Date();

    const { data: attempts } = await supabase
      .from("challenge_attempts")
      .select("nickname, score, time_taken_secs, created_at")
      .eq("challenge_id", id)
      .order("score", { ascending: false })
      .order("time_taken_secs", { ascending: true });

    let hasAttempted = false;
    let userAttempt = null;

    if (user) {
      const { data: attempt } = await supabase
        .from("challenge_attempts")
        .select("score, time_taken_secs")
        .eq("challenge_id", id)
        .eq("user_id", user.id)
        .single();

      if (attempt) {
        hasAttempted = true;
        userAttempt = attempt;
      }
    }

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        challengerName: challenge.challenger_name,
        score: challenge.score,
        timeTakenSecs: challenge.time_taken_secs,
        category: challenge.category,
        weekNumber: challenge.week_number,
        expiresAt: challenge.expires_at,
        isExpired,
      },
      attempts: attempts ?? [],
      hasAttempted,
      userAttempt,
      isChallenger: user?.id === challenge.challenger_id,
    });
  } catch (error) {
    console.error("Get challenge error:", error);
    return NextResponse.json(
      { error: "Failed to load challenge" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { answers } = await request.json();
    const supabase = getAdminClient();

    const { data: challenge } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", id)
      .single();

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    if (new Date(challenge.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This challenge has expired" },
        { status: 410 },
      );
    }

    if (user.id === challenge.challenger_id) {
      return NextResponse.json(
        { error: "You cannot attempt your own challenge" },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("challenge_attempts")
      .select("id")
      .eq("challenge_id", id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "You have already attempted this challenge" },
        { status: 409 },
      );
    }

    const questionIds = answers.map((a: any) => a.questionId);
    const { data: realQuestions } = await supabase
      .from("questions")
      .select("id, correct_answer")
      .in("id", questionIds);

    let totalScore = 0;
    let totalTimeSecs = 0;

    answers.forEach((answer: any) => {
      const real = realQuestions?.find((q) => q.id === answer.questionId);
      const isCorrect = real?.correct_answer === answer.selectedAnswer;
      if (isCorrect) {
        const timeBonus = Math.max(0, 15 - answer.secondsTaken) * 5;
        totalScore += 100 + timeBonus;
      }
      totalTimeSecs += answer.secondsTaken || 0;
    });

    const { data: profile } = await supabase
      .from("users")
      .select("nickname, xp")
      .eq("id", user.id)
      .single();

    await supabase.from("challenge_attempts").insert({
      challenge_id: id,
      user_id: user.id,
      nickname: profile?.nickname || "Player",
      score: totalScore,
      time_taken_secs: totalTimeSecs,
    });

    const xpBonus = 50;
    await supabase
      .from("users")
      .update({ xp: (profile?.xp || 0) + xpBonus })
      .eq("id", user.id);

    await supabase.from("xp_log").insert({
      user_id: user.id,
      amount: xpBonus,
      reason: `Accepted friend challenge from ${challenge.challenger_name}`,
      week_number: getCurrentWeekNumber(),
    });

    const won =
      totalScore > challenge.score ||
      (totalScore === challenge.score &&
        totalTimeSecs < challenge.time_taken_secs);

    return NextResponse.json({
      score: totalScore,
      timeTakenSecs: totalTimeSecs,
      challengerScore: challenge.score,
      challengerName: challenge.challenger_name,
      won,
      xpEarned: xpBonus,
    });
  } catch (error) {
    console.error("Challenge attempt error:", error);
    return NextResponse.json(
      { error: "Failed to submit attempt" },
      { status: 500 },
    );
  }
}
