// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  async function handleLogin() {
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Please enter your email and password");
      setLoading(false);
      return;
    }

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      // Login successful — go to the game
      router.push("/play");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Invalid email or password";
      setError(message);
    } finally {
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

        {/* Login Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 className="text-white text-xl font-semibold mb-6">
            Welcome back
          </h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

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

          <div className="mb-6">
            <label className="text-[#93c5fd] text-sm block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading ? "Logging in..." : "Enter the Challenge"}
          </button>

          <p className="text-white/40 text-sm text-center mt-4">
            New player?{" "}
            <Link href="/register" className="text-[#3b82f6] hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-6 tracking-wider">
          Built for Liberia · © 2026 EED
        </p>
      </div>
    </div>
  );
}
