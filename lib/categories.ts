// lib/categories.ts
// Quiz category definitions
// Single source of truth — used by frontend and backend

export const CATEGORIES = [
  {
    id: "general",
    name: "General Knowledge",
    emoji: "🇱🇷",
    description: "Mixed questions about Liberia",
    color: "bg-blue-500/20 border-blue-500/30 text-blue-300",
    activeColor: "bg-blue-500 text-white",
  },
  {
    id: "history",
    name: "History",
    emoji: "📜",
    description: "Presidents, independence, civil war",
    color: "bg-amber-500/20 border-amber-500/30 text-amber-300",
    activeColor: "bg-amber-500 text-white",
  },
  {
    id: "geography",
    name: "Geography",
    emoji: "🗺️",
    description: "Counties, capitals, rivers, borders",
    color: "bg-green-500/20 border-green-500/30 text-green-300",
    activeColor: "bg-green-500 text-white",
  },
  {
    id: "culture",
    name: "Culture & People",
    emoji: "🎭",
    description: "Food, music, traditions, language",
    color: "bg-purple-500/20 border-purple-500/30 text-purple-300",
    activeColor: "bg-purple-500 text-white",
  },
  {
    id: "sports",
    name: "Sports",
    emoji: "⚽",
    description: "Football, athletes, George Weah",
    color: "bg-red-500/20 border-red-500/30 text-red-300",
    activeColor: "bg-red-500 text-white",
  },
  {
    id: "government",
    name: "Government & Law",
    emoji: "⚖️",
    description: "Constitution, legislature, branches",
    color: "bg-teal-500/20 border-teal-500/30 text-teal-300",
    activeColor: "bg-teal-500 text-white",
  },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function getCategoryById(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}
