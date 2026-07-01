"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { LEVELS } from "@/lib/xp-system";

type Level = {
  level: number;
  name: string;
  badge: string;
  minXp: number;
};

type ProfileData = {
  profile: {
    nickname: string;
    xp: number;
    level: number;
    streak: number;
    last_played: number | null;
    member_since: string;
  };
  stats: {
    totalPlays: number;
    bestScore: number;
    averageScore: number;
    timesChampion: number;
  };
  levelProgress: {
    current: Level;
    next: Level | null;
    progressPercent: number;
    xpToNext: number;
  };
  streakMessage: string;
  recentScores: {
    score: number;
    time_taken_secs: number;
    week_number: number;
    created_at: string;
  }[];
  xpLog: {
    amount: number;
    reason: string;
    week_number: number;
    created_at: string;
  }[];
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");

        if (res.status === 401) {
          router.push("/login");
          return;
        }

        if (!res.ok) {
          setError("Failed to load your profile. Please try again later.");
          return;
        }

        const json = await res.json();
        setData(json);
      } catch {
        setError("Could not connect. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // ── LOADING STATE ─────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/60 tracking-wider">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ───────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-red-400 mb-4">
              {error || "Something went wrong"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-[#3b82f6] text-sm hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SAFETY GUARD ──────────────────────────────────────
  // If the database columns do not exist yet (XP system not set up)
  // show a friendly message instead of crashing
  if (!data.levelProgress || !data.levelProgress.current) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-white/60 mb-2">Profile is being set up...</p>
            <p className="text-white/30 text-sm mb-4">
              Play a quiz to unlock your full profile with XP and levels.
            </p>
            <Link
              href="/play"
              className="text-[#3b82f6] text-sm hover:underline"
            >
              Play now →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN RENDER ───────────────────────────────────────
  const { profile, stats, levelProgress, streakMessage, recentScores, xpLog } =
    data;

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      <Navbar />

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        {/* Profile header card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4 mt-4 text-center">
          {/* Level badge emoji */}
          <div className="text-5xl mb-3">{levelProgress.current.badge}</div>

          <h1 className="text-white font-serif text-2xl font-bold mb-1">
            {profile.nickname}
          </h1>

          <p className="text-[#3b82f6] text-sm mb-1">
            Level {profile.level} · {levelProgress.current.name}
          </p>

          <p className="text-white/30 text-xs">
            Member since {formatDate(profile.member_since)}
          </p>

          {/* Streak badge */}
          {profile.streak > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5">
              <span className="text-lg">🔥</span>
              <span className="text-amber-400 text-sm font-medium">
                {profile.streak} week streak
              </span>
            </div>
          )}
        </div>

        {/* XP progress bar card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          {/* Level labels */}
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60 text-sm">
              {levelProgress.current.badge} {levelProgress.current.name}
            </span>
            {levelProgress.next && (
              <span className="text-white/40 text-sm">
                {levelProgress.next.badge} {levelProgress.next.name}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all duration-700"
              style={{ width: `${levelProgress.progressPercent}%` }}
            />
          </div>

          {/* XP numbers */}
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold text-sm">
              {profile.xp.toLocaleString()} XP
            </span>
            {levelProgress.next ? (
              <span className="text-white/40 text-xs">
                {levelProgress.xpToNext} XP to next level
              </span>
            ) : (
              <span className="text-amber-400 text-xs">
                Max level reached 🏆
              </span>
            )}
          </div>

          {/* All 7 level badges */}
          <div className="flex justify-between mt-4 pt-4 border-t border-white/10">
            {LEVELS.map((lvl) => (
              <div
                key={lvl.level}
                className={`flex flex-col items-center gap-1 transition-opacity ${
                  profile.level >= lvl.level ? "opacity-100" : "opacity-25"
                }`}
              >
                <span className="text-lg">{lvl.badge}</span>
                <span className="text-white/40 text-xs">{lvl.level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            {
              label: "Total plays",
              value: stats.totalPlays.toString(),
              color: "text-[#3b82f6]",
            },
            {
              label: "Best score",
              value: stats.bestScore.toLocaleString(),
              color: "text-amber-400",
            },
            {
              label: "Average score",
              value: stats.averageScore.toLocaleString(),
              color: "text-green-400",
            },
            {
              label: "Times champion",
              value: `${stats.timesChampion} 👑`,
              color: "text-purple-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <p className="text-white/40 text-xs mb-1 tracking-wider">
                {stat.label.toUpperCase()}
              </p>
              <p className={`text-2xl font-bold font-serif ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Streak message */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
          <p className="text-white/60 text-sm text-center">{streakMessage}</p>
        </div>

        {/* Recent scores */}
        {recentScores.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
            <p className="text-white/60 text-xs tracking-wider uppercase mb-4">
              Recent games
            </p>
            <div className="space-y-3">
              {recentScores.map((score, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">
                      Week {score.week_number}
                    </p>
                    <p className="text-white/30 text-xs">
                      {formatDate(score.created_at)} ·{" "}
                      {formatTime(score.time_taken_secs)}
                    </p>
                  </div>
                  <p className="text-white font-bold">
                    {score.score.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* XP log */}
        {xpLog.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
            <p className="text-white/60 text-xs tracking-wider uppercase mb-4">
              Recent XP earned
            </p>
            <div className="space-y-2">
              {xpLog.map((entry, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-white/60 text-sm">{entry.reason}</p>
                  <p className="text-green-400 text-sm font-semibold">
                    +{entry.amount} XP
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 mt-2 mb-6">
          <Link
            href="/play"
            className="block w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl text-center transition-colors"
          >
            Play this week
          </Link>
          <Link
            href="/leaderboard"
            className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl text-center transition-colors"
          >
            View leaderboard
          </Link>
        </div>
      </div>

      <footer className="border-t border-white/10 px-4 py-3 text-center">
        <p className="text-white/20 text-xs tracking-wider">
          Built for Liberia · © 2026 EED
        </p>
      </footer>
    </div>
  );
}
