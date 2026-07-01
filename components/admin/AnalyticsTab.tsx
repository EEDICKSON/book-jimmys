// components/admin/AnalyticsTab.tsx
"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { getCountyName } from "@/lib/counties";
import { LEVELS } from "@/lib/xp-system";

type AnalyticsData = {
  summary: {
    totalUsers: number;
    thisWeekPlays: number;
    lastWeekPlays: number;
    playGrowthPct: number;
    thisWeekAvgScore: number;
    totalChampions: number;
    todayDailyPlays: number;
    dailyAccuracyPct: number;
    activeStreakers: number;
    avgStreak: number;
    maxStreak: number;
  };
  weeklyTrend: { week: number; plays: number; avgScore: number }[];
  userGrowth: { week: number; newUsers: number }[];
  categoryBreakdown: { category: string; plays: number }[];
  countyBreakdown: { county: string; players: number }[];
  levelDistribution: { level: number; count: number }[];
};

// Simple bar component
function Bar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Stat card
function StatCard({
  label,
  value,
  sub,
  color = "text-white",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/40 text-xs tracking-wider mb-1">
        {label.toUpperCase()}
      </p>
      <p className={`text-2xl font-bold font-serif ${color}`}>{value}</p>
      {sub && <p className="text-white/30 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (!res.ok) throw new Error("Failed");
        setData(await res.json());
      } catch {
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-white/40 text-sm tracking-wider">
          Loading analytics...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  const {
    summary,
    weeklyTrend,
    userGrowth,
    categoryBreakdown,
    countyBreakdown,
    levelDistribution,
  } = data;
  const maxPlays = Math.max(...weeklyTrend.map((w) => w.plays), 1);
  const maxNewUsers = Math.max(...userGrowth.map((w) => w.newUsers), 1);
  const maxCatPlays = Math.max(...categoryBreakdown.map((c) => c.plays), 1);
  const maxCounty = Math.max(...countyBreakdown.map((c) => c.players), 1);
  const maxLevel = Math.max(...levelDistribution.map((l) => l.count), 1);

  return (
    <div className="space-y-6">
      {/* ── SUMMARY CARDS ────────────────────────────── */}
      <div>
        <p className="text-white/40 text-xs tracking-widest uppercase mb-3">
          This week
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Weekly plays"
            value={summary.thisWeekPlays}
            sub={
              summary.playGrowthPct >= 0
                ? `▲ ${summary.playGrowthPct}% vs last week`
                : `▼ ${Math.abs(summary.playGrowthPct)}% vs last week`
            }
            color={
              summary.playGrowthPct >= 0 ? "text-green-400" : "text-red-400"
            }
          />
          <StatCard
            label="Avg score"
            value={summary.thisWeekAvgScore.toLocaleString()}
            sub="this week"
            color="text-[#3b82f6]"
          />
          <StatCard
            label="Daily plays today"
            value={summary.todayDailyPlays}
            sub={`${summary.dailyAccuracyPct}% correct`}
            color="text-amber-400"
          />
          <StatCard
            label="Active streaks"
            value={summary.activeStreakers}
            sub={`Avg ${summary.avgStreak}w · Max ${summary.maxStreak}w`}
            color="text-purple-400"
          />
        </div>
      </div>

      {/* ── WEEKLY PLAYS TREND ───────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-white/60 text-xs tracking-widest uppercase mb-4">
          Weekly plays — last 8 weeks
        </p>
        <div className="space-y-2">
          {weeklyTrend.map((w) => (
            <div key={w.week} className="flex items-center gap-3">
              <span className="text-white/30 text-xs w-16 flex-shrink-0">
                Week {w.week}
              </span>
              <div className="flex-1">
                <Bar value={w.plays} max={maxPlays} color="bg-[#2563EB]" />
              </div>
              <span className="text-white text-xs w-8 text-right">
                {w.plays}
              </span>
              <span className="text-white/30 text-xs w-20 text-right">
                {w.avgScore > 0 ? `avg ${w.avgScore}` : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── USER GROWTH ──────────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-white/60 text-xs tracking-widest uppercase mb-4">
          New users — last 8 weeks
        </p>
        <div className="space-y-2">
          {userGrowth.map((w) => (
            <div key={w.week} className="flex items-center gap-3">
              <span className="text-white/30 text-xs w-16 flex-shrink-0">
                Week {w.week}
              </span>
              <div className="flex-1">
                <Bar
                  value={w.newUsers}
                  max={maxNewUsers}
                  color="bg-green-500"
                />
              </div>
              <span className="text-white text-xs w-8 text-right">
                {w.newUsers}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 mt-4 pt-3 flex items-center justify-between">
          <span className="text-white/40 text-xs">Total registered</span>
          <span className="text-white font-bold">
            {summary.totalUsers.toLocaleString()} players
          </span>
        </div>
      </div>

      {/* ── CATEGORY BREAKDOWN ───────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-white/60 text-xs tracking-widest uppercase mb-4">
          Category plays this week
        </p>
        {categoryBreakdown.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">
            No plays this week yet
          </p>
        ) : (
          <div className="space-y-3">
            {categoryBreakdown.map((c) => {
              const cat = CATEGORIES.find((x) => x.id === c.category);
              return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="text-lg w-8 flex-shrink-0">
                    {cat?.emoji || "🇱🇷"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm">
                        {cat?.name || c.category}
                      </span>
                      <span className="text-white/40 text-xs">
                        {c.plays} plays
                      </span>
                    </div>
                    <Bar
                      value={c.plays}
                      max={maxCatPlays}
                      color="bg-[#2563EB]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── COUNTY BREAKDOWN ─────────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-white/60 text-xs tracking-widest uppercase mb-4">
          Top counties by players
        </p>
        {countyBreakdown.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">
            No county data yet — players have not set their county
          </p>
        ) : (
          <div className="space-y-2">
            {countyBreakdown.map((c, i) => (
              <div key={c.county} className="flex items-center gap-3">
                <span className="text-white/30 text-xs w-4">{i + 1}</span>
                <span className="text-white text-sm flex-1">
                  {getCountyName(c.county)}
                </span>
                <div className="w-32">
                  <Bar value={c.players} max={maxCounty} color="bg-amber-500" />
                </div>
                <span className="text-white/40 text-xs w-16 text-right">
                  {c.players} players
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── LEVEL DISTRIBUTION ───────────────────────── */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-white/60 text-xs tracking-widest uppercase mb-4">
          Player level distribution
        </p>
        <div className="space-y-2">
          {levelDistribution.map((l) => {
            const lvl = LEVELS.find((x) => x.level === l.level);
            return (
              <div key={l.level} className="flex items-center gap-3">
                <span className="text-lg w-8">{lvl?.badge}</span>
                <span className="text-white/60 text-xs w-24 flex-shrink-0">
                  {lvl?.name}
                </span>
                <div className="flex-1">
                  <Bar value={l.count} max={maxLevel} color="bg-purple-500" />
                </div>
                <span className="text-white/40 text-xs w-12 text-right">
                  {l.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── HALL OF FAME STATS ───────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total champions"
          value={summary.totalChampions}
          sub="all time winners"
          color="text-amber-400"
        />
        <StatCard
          label="Last week plays"
          value={summary.lastWeekPlays}
          sub="for comparison"
          color="text-white/60"
        />
      </div>
    </div>
  );
}
