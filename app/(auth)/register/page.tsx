// app/(auth)/register/page.tsx
"use client";
// 'use client' means this component runs in the browser
// It can use React state, event handlers, and browser APIs

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function RegisterPage() {
  // State = data that can change and cause the page to re-render
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter(); // Used to navigate to another page
  const supabase = createBrowserSupabaseClient();

  async function handleRegister() {
    // Clear any previous error
    setError(null);
    setLoading(true);

    // Basic validation before touching the database
    if (!email || !password || !nickname) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (nickname.length < 3) {
      setError("Nickname must be at least 3 characters");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create the auth account in Supabase Auth
      // This handles password hashing automatically — we never store plain passwords
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // Step 2: If auth succeeded, save the user profile to our users table
      // authData.user.id is the UUID Supabase just created
      if (authData.user) {
        const { error: profileError } = await supabase.from("users").insert({
          id: authData.user.id, // Same ID as auth — links them together
          email,
          nickname,
        });

        if (profileError) throw profileError;
      }

      // Step 3: Redirect to the game
      router.push("/play");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      // This always runs — whether success or failure
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* EED Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full border-2 border-[#2563EB] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-serif font-bold text-lg tracking-widest">
              EED
            </span>
          </div>
          <h1 className="text-white font-serif text-3xl font-bold">
            Book Jimmy's
          </h1>
          <p className="text-[#3b82f6] text-sm tracking-widest uppercase mt-1">
            Liberia Weekly Challenge
          </p>
        </div>

        {/* Register Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-white text-xl font-semibold mb-6">
            Create your account
          </h2>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Nickname Field */}
          <div className="mb-4">
            <label className="text-[#93c5fd] text-sm block mb-2">
              Nickname (shown on leaderboard)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. MonroviaKing"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          {/* Email Field */}
          <div className="mb-4">
            <label className="text-[#93c5fd] text-sm block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <label className="text-[#93c5fd] text-sm block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? "Creating account..." : "Join the Challenge"}
          </button>

          {/* Link to Login */}
          <p className="text-white/40 text-sm text-center mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-[#3b82f6] hover:underline">
              Log in
            </Link>
          </p>
        </div>

        {/* EED Footer */}
        <p className="text-center text-white/20 text-xs mt-6 tracking-wider">
          Built for Liberia · © 2026 EED
        </p>
      </div>
    </div>
  );
}
