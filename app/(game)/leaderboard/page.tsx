"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import LeaderboardRow from "@/components/game/LeaderboardRow";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";
import { COUNTIES, getCountyName } from "@/lib/counties";
import { CATEGORIES } from "@/lib/categories";

type LeaderboardEntry = {
  rank: number;
  nickname: string;
  county: string | null;
  level: number;
  score: number;
  timeTakenSecs: number;
  category: string;
  weekNumber: number;
};

// ── CUSTOM DROPDOWN ───────────────────────────────────────
function Dropdown({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm text-left flex items-center justify-between hover:bg-white/15 transition-colors focus:outline-none focus:border-[#2563EB]"
      >
        <span className={value ? "text-white" : "text-white/40"}>
          {selectedLabel}
        </span>
        <span
          className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f2744] border border-white/20 rounded-xl overflow-hidden z-50 shadow-2xl max-h-64 overflow-y-auto">
          {/* Clear option */}
          <button
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={`w-full px-4 py-3 text-sm text-left transition-colors hover:bg-white/10 ${
              !value ? "text-[#3b82f6] bg-white/5" : "text-white/40"
            }`}
          >
            {placeholder}
          </button>

          {/* Divider */}
          <div className="h-px bg-white/10" />

          {/* Options */}
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-sm text-left transition-colors hover:bg-white/10 ${
                value === opt.value
                  ? "text-[#3b82f6] bg-[#2563EB]/10"
                  : "text-white"
              }`}
            >
              {opt.label}
              {value === opt.value && <span className="float-right">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentNickname, setCurrentNickname] = useState<string | null>(null);
  const [currentCounty, setCurrentCounty] = useState<string | null>(null);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [countySummary, setCountySummary] = useState<Record<string, number>>(
    {},
  );
  const [viewMode, setViewMode] = useState<"national" | "county">("national");
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const channelRef = useRef<any>(null);
  const weekNumber = getCurrentWeekNumber();

  function rankEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    return entries
      .sort((a, b) =>
        b.score !== a.score
          ? b.score - a.score
          : a.timeTakenSecs - b.timeTakenSecs,
      )
      .slice(0, 10)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  async function loadLeaderboard() {
    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("nickname, county")
          .eq("id", user.id)
          .single();

        if (profile) {
          setCurrentNickname(profile.nickname);
          setCurrentCounty(profile.county);
          if (profile.county && !selectedCounty) {
            setSelectedCounty(profile.county);
          }
        }
      }

      const params = new URLSearchParams();
      if (viewMode === "county" && selectedCounty)
        params.set("county", selectedCounty);
      if (selectedCategory) params.set("category", selectedCategory);

      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setLeaderboard(data.leaderboard);
      setCountySummary(data.countySummary || {});
    } catch {
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadLeaderboard();
  }, [viewMode, selectedCounty, selectedCategory]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    channelRef.current = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scores",
          filter: `week_number=eq.${weekNumber}`,
        },
        async (payload) => {
          const newScore = payload.new;
          const { data: userProfile } = await supabase
            .from("users")
            .select("nickname, county, level")
            .eq("id", newScore.user_id)
            .single();

          const newEntry: LeaderboardEntry = {
            rank: 0,
            nickname: userProfile?.nickname ?? "Unknown Player",
            county: userProfile?.county ?? null,
            level: userProfile?.level ?? 1,
            score: newScore.score,
            timeTakenSecs: newScore.time_taken_secs,
            category: newScore.category || "general",
            weekNumber: newScore.week_number,
          };
          setLiveUpdate(true);
          setTimeout(() => setLiveUpdate(false), 2000);
          setLeaderboard((prev) => rankEntries([...prev, newEntry]));
        },
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [weekNumber]);

  // Build dropdown options
  const countyOptions = COUNTIES.map((c) => ({
    value: c.id,
    label: `${c.name}${countySummary[c.id] ? ` (${countySummary[c.id]})` : ""}`,
  }));

  const categoryOptions = CATEGORIES.map((c) => ({
    value: c.id,
    label: `${c.emoji} ${c.name}`,
  }));

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      <Navbar />

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-5 pt-4">
          <h1 className="text-white font-serif text-2xl font-bold mb-1">
            Week {weekNumber} Leaderboard
          </h1>
          <p className="text-white/40 text-sm">Resets every Friday</p>
        </div>

        {/* National / County toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setViewMode("national")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              viewMode === "national"
                ? "bg-[#2563EB] text-white"
                : "bg-white/5 border border-white/10 text-white/50 hover:text-white"
            }`}
          >
            🌍 National
          </button>
          <button
            onClick={() => setViewMode("county")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              viewMode === "county"
                ? "bg-[#2563EB] text-white"
                : "bg-white/5 border border-white/10 text-white/50 hover:text-white"
            }`}
          >
            📍 By County
          </button>
        </div>

        {/* County dropdown — only in county mode */}
        {viewMode === "county" && (
          <div className="mb-4">
            <Dropdown
              value={selectedCounty}
              onChange={setSelectedCounty}
              options={countyOptions}
              placeholder="All counties"
            />
            {currentCounty && selectedCounty !== currentCounty && (
              <button
                onClick={() => setSelectedCounty(currentCounty)}
                className="text-[#3b82f6] text-xs mt-2 hover:underline"
              >
                Jump to my county ({getCountyName(currentCounty)}) →
              </button>
            )}
            {!currentCounty && (
              <Link
                href="/county"
                className="block text-[#3b82f6] text-xs mt-2 hover:underline"
              >
                Set your county to appear here →
              </Link>
            )}
          </div>
        )}

        {/* Category dropdown */}
        <div className="mb-4">
          <Dropdown
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={categoryOptions}
            placeholder="All categories"
          />
        </div>

        {/* Live update flash */}
        {liveUpdate && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-2 mb-4 text-center">
            <p className="text-green-400 text-sm">
              ✦ New score just submitted!
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm">Loading leaderboard...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && leaderboard.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/40 text-sm mb-2">
              {viewMode === "county" && selectedCounty
                ? `No scores from ${getCountyName(selectedCounty)} this week`
                : "No scores yet this week"}
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
              <div
                key={`${entry.nickname}-${entry.score}`}
                className="relative"
              >
                <LeaderboardRow
                  rank={entry.rank}
                  nickname={entry.nickname}
                  score={entry.score}
                  timeTakenSecs={entry.timeTakenSecs}
                  isCurrentUser={entry.nickname === currentNickname}
                />
                {entry.county && viewMode === "national" && (
                  <span className="absolute top-2 right-12 text-xs text-white/30">
                    📍 {getCountyName(entry.county)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {!loading && (
          <div className="mt-8 space-y-3">
            <Link
              href="/play"
              className="block w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl text-center transition-colors"
            >
              Play this week
            </Link>
            <Link
              href="/county"
              className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white/60 font-semibold py-3 rounded-xl text-center transition-colors text-sm"
            >
              📍{" "}
              {currentCounty
                ? `Representing ${getCountyName(currentCounty)}`
                : "Set your county"}
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

      {/* Live indicator */}
      <div className="flex items-center justify-center gap-1.5 py-2">
        <div
          className={`w-2 h-2 rounded-full transition-colors ${liveUpdate ? "bg-green-400 animate-pulse" : "bg-green-500/40"}`}
        />
        <span className="text-white/30 text-xs">Live</span>
      </div>

      <footer className="border-t border-white/10 px-4 py-3 text-center">
        <p className="text-white/20 text-xs tracking-wider">
          Built for Liberia · © 2026 EED
        </p>
      </footer>
    </div>
  );
}
