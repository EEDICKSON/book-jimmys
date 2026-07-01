// lib/xp-system.ts
// XP calculation, level thresholds, streak logic
// Pure functions — no database calls, easy to test

export const XP_REWARDS = {
  PLAY_QUIZ: 50,
  CORRECT_ANSWER: 20,
  TOP_THREE: 100,
  CHAMPION: 200,
  STREAK_BONUS: 30,
} as const;

export const LEVELS = [
  { level: 1, name: "Newcomer", minXp: 0, badge: "🌱" },
  { level: 2, name: "Student", minXp: 200, badge: "📚" },
  { level: 3, name: "Scholar", minXp: 500, badge: "🎓" },
  { level: 4, name: "Expert", minXp: 1000, badge: "⭐" },
  { level: 5, name: "Champion", minXp: 2000, badge: "🏆" },
  { level: 6, name: "Legend", minXp: 4000, badge: "👑" },
  { level: 7, name: "Liberian Icon", minXp: 8000, badge: "🇱🇷" },
] as const;

export type Level = (typeof LEVELS)[number];

// Get the level object for a given XP amount
export function getLevelFromXp(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i];
  }
  return LEVELS[0];
}

// Get progress to next level (0-100%)
export function getLevelProgress(xp: number): {
  current: Level;
  next: Level | null;
  progressPercent: number;
  xpToNext: number;
} {
  const current = getLevelFromXp(xp);
  const nextIndex = LEVELS.findIndex((l) => l.level === current.level) + 1;
  const next = nextIndex < LEVELS.length ? LEVELS[nextIndex] : null;

  if (!next) {
    return { current, next: null, progressPercent: 100, xpToNext: 0 };
  }

  const xpInCurrentLevel = xp - current.minXp;
  const xpNeededForNext = next.minXp - current.minXp;
  const progressPercent = Math.round(
    (xpInCurrentLevel / xpNeededForNext) * 100,
  );

  return {
    current,
    next,
    progressPercent,
    xpToNext: next.minXp - xp,
  };
}

// Calculate how much XP a player earns for a quiz attempt
export function calculateQuizXp(
  correctAnswers: number,
  rank: number,
  streak: number,
): { total: number; breakdown: { reason: string; amount: number }[] } {
  const breakdown: { reason: string; amount: number }[] = [];

  // Base XP for playing
  breakdown.push({
    reason: "Played the weekly quiz",
    amount: XP_REWARDS.PLAY_QUIZ,
  });

  // XP per correct answer
  if (correctAnswers > 0) {
    const correctXp = correctAnswers * XP_REWARDS.CORRECT_ANSWER;
    breakdown.push({
      reason: `${correctAnswers} correct answers`,
      amount: correctXp,
    });
  }

  // Top 3 bonus
  if (rank <= 3 && rank > 0) {
    breakdown.push({
      reason: `Top ${rank} finish`,
      amount: XP_REWARDS.TOP_THREE,
    });
  }

  // Champion bonus
  if (rank === 1) {
    breakdown.push({ reason: "Weekly champion", amount: XP_REWARDS.CHAMPION });
  }

  // Streak bonus
  if (streak > 1) {
    const streakXp = streak * XP_REWARDS.STREAK_BONUS;
    breakdown.push({ reason: `${streak} week streak`, amount: streakXp });
  }

  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);
  return { total, breakdown };
}

// Check if a streak should be continued or reset
export function calculateNewStreak(
  currentStreak: number,
  lastPlayedWeek: number | null,
  currentWeek: number,
): number {
  if (!lastPlayedWeek) return 1; // First time playing
  if (lastPlayedWeek === currentWeek - 1) return currentStreak + 1; // Consecutive week
  if (lastPlayedWeek === currentWeek) return currentStreak; // Same week (already counted)
  return 1; // Streak broken — reset to 1
}

// Get a motivational streak message
export function getStreakMessage(streak: number): string {
  if (streak >= 10)
    return `${streak} weeks strong! You are a Liberian Icon! 🇱🇷`;
  if (streak >= 5) return `${streak} week streak! You are on fire! 🔥`;
  if (streak >= 3) return `${streak} weeks in a row! Keep it up! ⚡`;
  if (streak >= 2) return `${streak} week streak! Come back next week! 💪`;
  return "Welcome back! Start your streak this week!";
}
