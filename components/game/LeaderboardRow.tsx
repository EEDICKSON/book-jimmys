// components/game/LeaderboardRow.tsx
// Displays one player's row on the leaderboard
// Highlights the top 3 with special styling

"use client";

type LeaderboardRowProps = {
  rank: number;
  nickname: string;
  score: number;
  timeTakenSecs: number;
  isCurrentUser?: boolean; // Highlights YOUR row
};

// Medal colors for top 3
function getRankStyle(rank: number) {
  if (rank === 1)
    return {
      badge: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
      row: "bg-amber-500/5 border-amber-500/20",
      label: "🥇",
    };
  if (rank === 2)
    return {
      badge: "bg-slate-400/20 text-slate-300 border border-slate-400/40",
      row: "bg-white/5 border-white/10",
      label: "🥈",
    };
  if (rank === 3)
    return {
      badge: "bg-amber-700/20 text-amber-600 border border-amber-700/40",
      row: "bg-white/5 border-white/10",
      label: "🥉",
    };
  return {
    badge: "bg-white/5 text-white/40 border border-white/10",
    row: "bg-white/5 border-white/10",
    label: `${rank}`,
  };
}

// Format seconds into a readable time string
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function LeaderboardRow({
  rank,
  nickname,
  score,
  timeTakenSecs,
  isCurrentUser = false,
}: LeaderboardRowProps) {
  const style = getRankStyle(rank);

  return (
    <div
      className={`
      flex items-center gap-4 px-4 py-3 rounded-xl border transition-all
      ${style.row}
      ${isCurrentUser ? "ring-1 ring-[#2563EB] ring-offset-1 ring-offset-[#0b1f3a]" : ""}
    `}
    >
      {/* Rank badge */}
      <div
        className={`
        w-8 h-8 rounded-lg flex items-center justify-center
        text-sm font-bold flex-shrink-0 ${style.badge}
      `}
      >
        {style.label}
      </div>

      {/* Nickname */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-semibold truncate ${
            isCurrentUser ? "text-[#3b82f6]" : "text-white"
          }`}
        >
          {nickname}
          {isCurrentUser && (
            <span className="text-xs text-white/40 font-normal ml-2">you</span>
          )}
        </p>
        <p className="text-white/30 text-xs mt-0.5">
          Completed in {formatTime(timeTakenSecs)}
        </p>
      </div>

      {/* Score */}
      <div className="text-right flex-shrink-0">
        <p
          className={`font-bold text-lg ${
            rank === 1 ? "text-amber-400" : "text-white"
          }`}
        >
          {score}
        </p>
        <p className="text-white/30 text-xs">points</p>
      </div>
    </div>
  );
}
