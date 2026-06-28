// lib/supabase.ts
// This file now just re-exports from the split files
// Keeps old imports working during transition

export { createBrowserSupabaseClient } from "./supabase/client";
export { createServerSupabaseClient } from "./supabase/server";
