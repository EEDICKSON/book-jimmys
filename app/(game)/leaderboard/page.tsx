// app/(game)/leaderboard/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import LeaderboardRow from "@/components/game/LeaderboardRow";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

type LeaderboardEntry = {
  rank: number;
  nickname: string;
  score: number;
  timeTakenSecs: number;
  weekNumber: number;
};

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNickname, setCurrentNickname] = useState<string | null>(null);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const channelRef = useRef<any>(null);
  const weekNumber = getCurrentWeekNumber();

  // Helper: re-rank entries after a new score arrives
  function rankEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries
      .sort((a, b) => {
        // Sort by score descending, then time ascending (tiebreaker)
        if (b.score !== a.score) return b.score - a.score;
        return a.timeTakenSecs - b.timeTakenSecs;
      })
      .slice(0, 10) // Keep top 10 only
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  // Fetch initial leaderboard data
  useEffect(() => {
    async function loadLeaderboard() {
      try {
        // Get current user's nickname for highlighting their row
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("users")
            .select("nickname")
            .eq("id", user.id)
            .single();

          if (profile) setCurrentNickname(profile.nickname);
        }

        // Fetch leaderboard from our API
        const res = await fetch("/api/leaderboard");
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        setLeaderboard(data.leaderboard);
      } catch (err) {
        setError("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  // Set up Supabase Realtime subscription
  // This is the magic that makes the leaderboard live
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    // Create a channel — think of it as a radio frequency
    // we tune into to hear score updates
    channelRef.current = supabase
      .channel("leaderboard-changes") // Name our channel
      .on(
        "postgres_changes", // Listen for database changes
        {
          event: "INSERT", // Only when new rows are added
          schema: "public",
          table: "scores", // Watch the scores table
          filter: `week_number=eq.${weekNumber}`, // Only this week's scores
        },
        async (payload) => {
          // A new score just came in!
          // payload.new contains the new row data
          const newScore = payload.new;

          // We need the nickname — fetch it from users table
          const { data: userProfile } = await supabase
            .from("users")
            .select("nickname")
            .eq("id", newScore.user_id)
            .single();

          const newEntry: LeaderboardEntry = {
            rank: 0, // Will be recalculated
            nickname: userProfile?.nickname ?? "Unknown Player",
            score: newScore.score,
            timeTakenSecs: newScore.time_taken_secs,
            weekNumber: newScore.week_number,
          };

          // Flash the live indicator
          setLiveUpdate(true);
          setTimeout(() => setLiveUpdate(false), 2000);

          // Add the new entry and re-rank everyone
          setLeaderboard((prev) => rankEntries([...prev, newEntry]));
        },
      )
      .subscribe();

    // Cleanup: unsubscribe when leaving the page
    // Like turning off a radio when you leave the room
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [weekNumber]);

  // ── RENDER ───────────────────────────────────────────────

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
        <div className="flex items-center gap-3">
          {/* Live indicator — pulses when a new score arrives */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full transition-colors ${
                liveUpdate ? "bg-green-400 animate-pulse" : "bg-green-500/40"
              }`}
            />
            <span className="text-white/40 text-xs">Live</span>
          </div>
          <Link href="/play" className="text-[#3b82f6] text-sm hover:underline">
            Play
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-6 pt-4">
          <h1 className="text-white font-serif text-2xl font-bold mb-1">
            Week {weekNumber} Leaderboard
          </h1>
          <p className="text-white/40 text-sm">
            Top players this week · Resets every Friday
          </p>
        </div>

        {/* Live update flash message */}
        {liveUpdate && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 mb-4 text-center">
            <p className="text-green-400 text-sm">
              ✦ New score just submitted!
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm tracking-wider">
              Loading leaderboard...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && leaderboard.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm mb-4">
              No scores yet this week.
            </p>
            <Link
              href="/play"
              className="text-[#3b82f6] text-sm hover:underline"
            >
              Be the first to play →
            </Link>
          </div>
        )}

        {/* Leaderboard list */}
        {!loading && leaderboard.length > 0 && (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <LeaderboardRow
                key={`${entry.nickname}-${entry.score}`}
                rank={entry.rank}
                nickname={entry.nickname}
                score={entry.score}
                timeTakenSecs={entry.timeTakenSecs}
                isCurrentUser={entry.nickname === currentNickname}
              />
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
              href="/hall-of-fame"
              className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl text-center transition-colors"
            >
              View Hall of Fame
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
