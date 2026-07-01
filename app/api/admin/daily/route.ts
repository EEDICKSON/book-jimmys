import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function verifyAdmin() {
  try {
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await authClient.auth.getUser();
    if (error || !user) return null;
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim());
    if (!adminEmails.includes(user.email || "")) return null;
    return user;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const user = await verifyAdmin();
    if (!user)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("daily_challenges")
      .select("*")
      .order("challenge_date", { ascending: false })
      .limit(60);

    if (error) throw error;
    return NextResponse.json({ challenges: data ?? [] });
  } catch (error) {
    console.error("Admin daily GET error:", error);
    return NextResponse.json(
      { error: "Failed to load challenges" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const body = await request.json();
    const {
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      category,
      challenge_date,
    } = body;

    if (
      !question_text ||
      !option_a ||
      !option_b ||
      !option_c ||
      !option_d ||
      !correct_answer ||
      !challenge_date
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("daily_challenges")
      .insert({
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer,
        category: category || "general",
        challenge_date,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `A challenge already exists for ${challenge_date}` },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ challenge: data });
  } catch (error) {
    console.error("Admin daily POST error:", error);
    return NextResponse.json(
      { error: "Failed to add challenge" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const supabase = getAdminClient();
    const { error } = await supabase
      .from("daily_challenges")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin daily DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
