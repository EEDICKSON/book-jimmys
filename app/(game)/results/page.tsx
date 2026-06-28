// app/(game)/results/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();

  const score = parseInt(params.get("score") || "0");
  const time = parseInt(params.get("time") || "0");
  const week = params.get("week") || "?";

  // Format share message
  const shareText = `I scored ${score} points on Book Jimmy's Liberia Weekly Challenge — Week ${week}! Can you beat me? 🇱🇷`;

  function handleShare() {
    if (navigator.share) {
      // Native mobile share sheet
      navigator.share({ text: shareText });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText);
      alert("Result copied to clipboard!");
    }
  }

  // Give the player a rating based on their score
  function getRating(score: number) {
    if (score >= 700) return { label: "Champion", color: "text-amber-400" };
    if (score >= 500) return { label: "Expert", color: "text-[#3b82f6]" };
    if (score >= 300) return { label: "Player", color: "text-green-400" };
    return { label: "Newcomer", color: "text-white/60" };
  }

  const rating = getRating(score);
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* EED Brand */}
        <div className="w-16 h-16 rounded-full border-2 border-[#2563EB] flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-serif font-bold text-lg">EED</span>
        </div>

        <h1 className="text-white font-serif text-2xl font-bold mb-1">
          Book <span className="text-[#2563EB]">Jimmy's</span>
        </h1>
        <p className="text-white/40 text-xs tracking-widest uppercase mb-8">
          Week {week} Results
        </p>

        {/* Score card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-6">
          <p
            className={`text-sm font-medium tracking-widest uppercase mb-2 ${rating.color}`}
          >
            {rating.label}
          </p>

          <div className="text-6xl font-bold text-white font-serif mb-2">
            {score}
          </div>
          <p className="text-white/40 text-sm mb-6">points</p>

          <div className="border-t border-white/10 pt-4">
            <p className="text-white/40 text-sm">
              Completed in{" "}
              <span className="text-white">
                {minutes > 0 ? `${minutes}m ` : ""}
                {seconds}s
              </span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={handleShare}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Share my result
          </button>

          <Link
            href="/leaderboard"
            className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            View leaderboard
          </Link>
        </div>

        <p className="text-white/20 text-xs mt-8 tracking-wider">
          Come back next week for a new challenge · Built for Liberia · © 2026
          EED
        </p>
      </div>
    </div>
  );
}

// Suspense is required when using useSearchParams in Next.js
export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
          <p className="text-white/60">Loading results...</p>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
