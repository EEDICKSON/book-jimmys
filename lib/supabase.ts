import { createClient } from "@supabase/supabase-js";

// These come from your .env.local file
// Next.js automatically loads them — no import needed
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The ! at the end tells TypeScript: "I promise this value exists"
// We're confident because our .env.local file has it

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Why "export"?
// So any other file in the project can import and use this one
// connection instead of creating a new one every time.
// Good engineering: one connection, shared everywhere.
