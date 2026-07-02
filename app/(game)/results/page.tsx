"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  generateShareCard,
  generateShareText,
  type ShareCardData,
} from "@/lib/share-card";

function ResultsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const score = parseInt(params.get("score") || "0");
  const time = parseInt(params.get("time") || "0");
  const week = parseInt(params.get("week") || "0");

  const [nickname, setNickname] = useState("Player");
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rank, setRank] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(1);
  const cardRef = useRef<HTMLImageElement>(null);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  function getRating(s: number) {
    if (s >= 1400) return { label: "Champion", color: "text-amber-400" };
    if (s >= 1000) return { label: "Expert", color: "text-[#3b82f6]" };
    if (s >= 600) return { label: "Player", color: "text-green-400" };
    return { label: "Newcomer", color: "text-white/60" };
  }

  const rating = getRating(score);
  const mins = Math.floor(time / 60);
  const secs = time % 60;

  // Fetch nickname and leaderboard rank
  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", user.id)
        .single();

      if (profile) setNickname(profile.nickname);

      // Get rank from scores table
      const { data: scores } = await supabase
        .from("scores")
        .select("score, time_taken_secs")
        .eq("week_number", week)
        .order("score", { ascending: false })
        .order("time_taken_secs", { ascending: true });

      if (scores) {
        setTotalPlayers(scores.length);
        const position = scores.findIndex(
          (s) => s.score === score && s.time_taken_secs === time,
        );
        setRank(position >= 0 ? position + 1 : scores.length);
      }
    }
    loadData();
  }, []);

  function getCardData(): ShareCardData {
    return {
      nickname,
      score,
      timeTakenSecs: time,
      weekNumber: week,
      rank,
      totalPlayers,
      rating: rating.label,
    };
  }

  // Generate the image card
  async function handleGenerateCard() {
    setGenerating(true);
    try {
      const url = await generateShareCard(getCardData());
      setCardUrl(url);
    } catch (err) {
      console.error("Card generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  // Share via Web Share API (native mobile sheet)
  async function handleShareText() {
    const text = generateShareText(getCardData());
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      // User cancelled — that is fine
    } finally {
      setSharing(false);
    }
  }

  // Download the image card
  function handleDownloadCard() {
    if (!cardUrl) return;
    const link = document.createElement("a");
    link.download = `bookjimmys-week${week}-${nickname}.png`;
    link.href = cardUrl;
    link.click();
  }

  // Share image via Web Share API
  async function handleShareImage() {
    if (!cardUrl) return;
    try {
      const blob = await (await fetch(cardUrl)).blob();
      const file = new File([blob], `bookjimmys-week${week}.png`, {
        type: "image/png",
      });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `I scored ${score} points on Book Jimmy's this week!`,
        });
      } else {
        handleDownloadCard();
      }
    } catch {
      handleDownloadCard();
    }
  }

  async function handleCreateChallenge() {
    setCreatingChallenge(true);
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          timeTakenSecs: time,
          category: params.get("category") || "general",
          weekNumber: week,
        }),
      });
      const data = await res.json();
      if (res.ok) setChallengeId(data.challengeId);
    } catch {
      console.error("Failed to create challenge");
    } finally {
      setCreatingChallenge(false);
    }
  }

  function handleShareChallenge() {
    if (!challengeId) return;
    const url = `${window.location.origin}/challenge/${challengeId}`;
    const text = `🎯 I challenge you on Book Jimmy's!\n\nI scored ${score.toLocaleString()} points\n\nCan you beat me? You have 24 hours!\n\n${url}\n\nBuilt for Liberia 🇱🇷`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-[#2563EB] flex items-center justify-center">
            <span className="text-white font-serif text-xs font-bold">EED</span>
          </div>
          <span className="text-white font-serif font-bold">
            Book <span className="text-[#2563EB]">Jimmy&apos;s</span>
          </span>
        </div>
        <span className="text-white/40 text-xs tracking-wider">
          Week {week} Results
        </span>
      </nav>

      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        {/* Score card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-4 text-center mt-4">
          <p
            className={`text-sm font-medium tracking-widest uppercase mb-3 ${rating.color}`}
          >
            {rating.label}
          </p>
          <div className="text-7xl font-bold text-white font-serif mb-2">
            {score.toLocaleString()}
          </div>
          <p className="text-white/40 text-sm mb-6">points</p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-white/30 text-xs mb-1 tracking-wider">Time</p>
              <p className="text-white font-semibold text-sm">
                {mins > 0 ? `${mins}m ` : ""}
                {secs}s
              </p>
            </div>
            <div>
              <p className="text-white/30 text-xs mb-1 tracking-wider">Rank</p>
              <p className="text-white font-semibold text-sm">
                #{rank} of {totalPlayers}
              </p>
            </div>
            <div>
              <p className="text-white/30 text-xs mb-1 tracking-wider">
                Player
              </p>
              <p className="text-white font-semibold text-sm truncate">
                {nickname}
              </p>
            </div>
          </div>
        </div>

        {/* Challenge a friend */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <p className="text-white/60 text-xs tracking-wider uppercase mb-4 text-center">
            Challenge a friend
          </p>
          {!challengeId ? (
            <button
              onClick={handleCreateChallenge}
              disabled={creatingChallenge}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {creatingChallenge
                ? "⏳ Creating..."
                : "🎯 Challenge a friend to beat your score"}
            </button>
          ) : (
            <div>
              <p className="text-green-400 text-sm text-center mb-3">
                ✓ Challenge created!
              </p>
              <button
                onClick={handleShareChallenge}
                className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition-colors"
              >
                📤 Share challenge on WhatsApp
              </button>
            </div>
          )}
        </div>

        {/* Share section */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <p className="text-white/60 text-xs tracking-wider uppercase mb-4 text-center">
            Share your result
          </p>

          {/* Text share button */}
          <button
            onClick={handleShareText}
            disabled={sharing}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mb-3 flex items-center justify-center gap-2"
          >
            {copied
              ? "✓ Copied to clipboard!"
              : sharing
                ? "Sharing..."
                : "📤 Share on WhatsApp"}
          </button>

          {/* Image card section */}
          {!cardUrl ? (
            <button
              onClick={handleGenerateCard}
              disabled={generating}
              className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-50 border border-white/20 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {generating ? "⏳ Generating card..." : "🎨 Generate share image"}
            </button>
          ) : (
            <div>
              {/* Preview of generated card */}
              <img
                ref={cardRef}
                src={cardUrl}
                alt="Your share card"
                className="w-full rounded-xl mb-3 border border-white/10"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShareImage}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  Share image
                </button>
                <button
                  onClick={handleDownloadCard}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  Download
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="space-y-3">
          <Link
            href="/leaderboard"
            className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl text-center transition-colors"
          >
            View leaderboard
          </Link>
          <Link
            href="/hall-of-fame"
            className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white/60 font-semibold py-3 rounded-xl text-center transition-colors text-sm"
          >
            Hall of Fame
          </Link>
        </div>

        <p className="text-center text-white/20 text-xs mt-6 tracking-wider">
          Come back next week · Built for Liberia · © 2026 EED
        </p>
      </div>
    </div>
  );
}

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
