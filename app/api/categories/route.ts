// app/api/categories/route.ts
// Public route — returns all active categories
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ categories: data ?? [] });
  } catch (error) {
    console.error("Categories error:", error);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 },
    );
  }
}
