// app/api/challenge/route.ts
// Creates a new friend challenge after a quiz

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

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

    const { score, timeTakenSecs, category, weekNumber } = await request.json();

    const supabase = getAdminClient();

    // Get challenger nickname
    const { data: profile } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Create challenge — expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: challenge, error } = await supabase
      .from("challenges")
      .insert({
        challenger_id: user.id,
        challenger_name: profile.nickname,
        score,
        time_taken_secs: timeTakenSecs,
        category: category || "general",
        week_number: weekNumber,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ challengeId: challenge.id });
  } catch (error) {
    console.error("Create challenge error:", error);
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 },
    );
  }
}
