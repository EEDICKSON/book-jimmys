// app/api/admin/categories/route.ts
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
    } = await authClient.auth.getUser();
    if (!user) return null;
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim());
    return adminEmails.includes(user.email || "") ? user : null;
  } catch {
    return null;
  }
}

// GET — all categories including inactive
export async function GET() {
  try {
    const user = await verifyAdmin();
    if (!user)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ categories: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 },
    );
  }
}

// POST — create new category
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { name, emoji, description } = await request.json();

    if (!name || !emoji) {
      return NextResponse.json(
        { error: "Name and emoji are required" },
        { status: 400 },
      );
    }

    // Generate ID from name — lowercase, spaces to underscores
    const id = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 30);

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        id,
        name: name.trim(),
        emoji,
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Category "${name}" already exists` },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({ category: data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}

// PATCH — toggle active/inactive
export async function PATCH(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { id, is_active } = await request.json();
    if (!id)
      return NextResponse.json(
        { error: "Category ID required" },
        { status: 400 },
      );

    const supabase = getAdminClient();
    const { error } = await supabase
      .from("categories")
      .update({ is_active })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

// DELETE — remove a category
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAdmin();
    if (!user)
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const id = request.nextUrl.searchParams.get("id");
    if (!id)
      return NextResponse.json(
        { error: "Category ID required" },
        { status: 400 },
      );

    // Prevent deleting built-in categories
    const builtIn = [
      "general",
      "history",
      "geography",
      "culture",
      "sports",
      "government",
    ];
    if (builtIn.includes(id)) {
      return NextResponse.json(
        {
          error:
            "Cannot delete built-in categories. You can hide them instead.",
        },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
