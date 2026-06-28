// app/(game)/hall-of-fame/page.tsx
// The permanent record of every Book Jimmy's weekly champion
// This page never resets — it grows every week forever

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type HallOfFameEntry = {
  id: string;
  nickname: string;
  score: number;
  week_number: number;
  crowned_at: string;
};

// Format the crowned date nicely
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function HallOfFamePage() {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHallOfFame() {
      try {
        const supabase = createBrowserSupabaseClient();

        const { data, error } = await supabase
          .from("hall_of_fame")
          .select("*")
          .order("crowned_at", { ascending: false }) // Newest first
          .limit(52); // Maximum 52 weeks in a year

        if (error) throw error;

        setEntries(data ?? []);
      } catch (err) {
        setError("Failed to load Hall of Fame");
      } finally {
        setLoading(false);
      }
    }

    loadHallOfFame();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-[#2563EB] flex items-center justify-center">
            <span className="text-white font-serif text-xs font-bold">EED</span>
          </div>
          <span className="text-white font-serif font-bold">
            Book <span className="text-[#2563EB]">Jimmy's</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/leaderboard"
            className="text-white/40 text-sm hover:text-white"
          >
            Leaderboard
          </Link>
          <Link href="/play" className="text-[#3b82f6] text-sm hover:underline">
            Play
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8 pt-4">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="text-white font-serif text-2xl font-bold mb-1">
            Hall of Fame
          </h1>
          <p className="text-white/40 text-sm">
            Every weekly champion · Permanent record
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-16 bg-[#2563EB]/40" />
            <span className="text-[#2563EB] text-xs tracking-widest uppercase">
              Built for Liberia
            </span>
            <div className="h-px w-16 bg-[#2563EB]/40" />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm tracking-wider">
              Loading champions...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Empty state — game just launched */}
        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm mb-2">No champions yet.</p>
            <p className="text-white/20 text-xs mb-6">
              The first winner will be crowned this Friday at 8pm.
            </p>
            <Link
              href="/play"
              className="text-[#3b82f6] text-sm hover:underline"
            >
              Play now and be the first →
            </Link>
          </div>
        )}

        {/* Champions list */}
        {!loading && entries.length > 0 && (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`
                  rounded-xl border px-5 py-4 flex items-center gap-4
                  ${
                    index === 0
                      ? "bg-amber-500/10 border-amber-500/30" // Latest winner — gold
                      : "bg-white/5 border-white/10"
                  }
                `}
              >
                {/* Trophy or week number */}
                <div
                  className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  flex-shrink-0 text-lg
                  ${index === 0 ? "bg-amber-500/20" : "bg-white/5"}
                `}
                >
                  {index === 0 ? "👑" : `W${entry.week_number}`}
                </div>

                {/* Name and date */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-bold truncate ${
                      index === 0 ? "text-amber-400" : "text-white"
                    }`}
                  >
                    {entry.nickname}
                  </p>
                  <p className="text-white/30 text-xs mt-0.5 truncate">
                    {formatDate(entry.crowned_at)}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={`font-bold text-lg ${
                      index === 0 ? "text-amber-400" : "text-white"
                    }`}
                  >
                    {entry.score}
                  </p>
                  <p className="text-white/30 text-xs">
                    Week {entry.week_number}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom actions */}
        {!loading && (
          <div className="mt-8 space-y-3">
            <Link
              href="/play"
              className="block w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl text-center transition-colors"
            >
              Play this week's quiz
            </Link>
            <Link
              href="/leaderboard"
              className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl text-center transition-colors"
            >
              View live leaderboard
            </Link>
          </div>
        )}
      </div>

      {/* EED Footer */}
      <footer className="border-t border-white/10 px-4 py-3 text-center mt-4">
        <p className="text-white/20 text-xs tracking-wider">
          Built for Liberia · © 2026 EED
        </p>
      </footer>
    </div>
  );
}
