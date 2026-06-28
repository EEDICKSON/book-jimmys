// types/index.ts
// These are the "shapes" of our data — used everywhere in the project

export type User = {
  id: string; // UUID from Supabase
  email: string;
  nickname: string;
  avatar_url: string | null; // null means optional
  created_at: string;
};

export type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "a" | "b" | "c" | "d"; // TypeScript only allows these 4 values
  week_number: number;
  created_at: string;
};

export type Score = {
  id: string;
  user_id: string;
  score: number;
  time_taken_secs: number;
  week_number: number;
  created_at: string;
};

export type HallOfFameEntry = {
  id: string;
  user_id: string;
  nickname: string;
  score: number;
  week_number: number;
  crowned_at: string;
};

// This type is used when we show the leaderboard
// It joins score data WITH user nickname in one object
export type LeaderboardEntry = {
  nickname: string;
  score: number;
  time_taken_secs: number;
  rank: number;
};
