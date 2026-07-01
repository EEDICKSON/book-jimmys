// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// GET — fetch all users with their stats
export async function GET() {
  try {
    // Verify admin
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim());
    if (!adminEmails.includes(user.email || "")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const supabase = getAdminClient();

    // Fetch all users with their stats
    const { data: users, error } = await supabase
      .from("users")
      .select("id, nickname, email, xp, level, streak, last_played, created_at")
      .order("xp", { ascending: false });

    if (error) throw error;

    // Get score counts per user
    const { data: scoreCounts } = await supabase
      .from("scores")
      .select("user_id");

    const playCountMap: Record<string, number> = {};
    scoreCounts?.forEach((s) => {
      playCountMap[s.user_id] = (playCountMap[s.user_id] || 0) + 1;
    });

    const enrichedUsers =
      users?.map((u) => ({
        ...u,
        totalPlays: playCountMap[u.id] || 0,
      })) ?? [];

    return NextResponse.json({ users: enrichedUsers });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Failed to load users" },
      { status: 500 },
    );
  }
}

// DELETE — remove a user account
export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim());
    if (!adminEmails.includes(user.email || "")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const userId = request.nextUrl.searchParams.get("id");
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();

    // Delete from users table (cascade handles scores, xp_log)
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 },
    );
  }
}
