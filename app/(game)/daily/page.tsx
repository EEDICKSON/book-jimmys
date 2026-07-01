"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import Timer from "@/components/game/Timer";
import Link from "next/link";

type Challenge = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  category: string;
  challenge_date: string;
};

type PageState =
  | "loading"
  | "ready"
  | "answering"
  | "revealed"
  | "completed"
  | "error";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function DailyPage() {
  const router = useRouter();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [alreadyCorrect, setAlreadyCorrect] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadChallenge() {
      try {
        const res = await fetch("/api/daily");
        const data = await res.json();

        if (res.status === 404) {
          setErrorMessage("No daily challenge today. Check back tomorrow!");
          setPageState("error");
          return;
        }
        if (!res.ok) throw new Error(data.error);

        setChallenge(data.challenge);
        setDailyStreak(data.dailyStreak);

        if (data.completed) {
          setAlreadyCorrect(data.isCorrect);
          setPageState("completed");
        } else {
          setPageState("ready");
        }
      } catch {
        setErrorMessage("Failed to load daily challenge");
        setPageState("error");
      }
    }
    loadChallenge();
  }, []);

  function handleStart() {
    setPageState("answering");
    setTimerRunning(true);
    setStartTime(Date.now());
  }

  const handleAnswer = useCallback(
    async (answer: string | null) => {
      if (pageState !== "answering" || !challenge) return;

      setTimerRunning(false);
      setPageState("revealed");
      setSelectedAnswer(answer);

      const timeTaken = Math.min(
        Math.round((Date.now() - startTime) / 1000),
        15,
      );

      try {
        const res = await fetch("/api/daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: challenge.id,
            selectedAnswer: answer,
            timeTakenSecs: timeTaken,
          }),
        });

        const data = await res.json();

        if (res.status === 409) {
          setPageState("completed");
          return;
        }

        setCorrectAnswer(data.correctAnswer);
        setIsCorrect(data.isCorrect);
        setXpEarned(data.xpEarned);
        setDailyStreak(data.dailyStreak);
      } catch {
        setErrorMessage("Failed to submit answer");
        setPageState("error");
      }
    },
    [pageState, challenge, startTime],
  );

  const handleTimeUp = useCallback(() => {
    handleAnswer(null);
  }, [handleAnswer]);

  const options = challenge
    ? [
        { key: "a", text: challenge.option_a },
        { key: "b", text: challenge.option_b },
        { key: "c", text: challenge.option_c },
        { key: "d", text: challenge.option_d },
      ]
    : [];

  function getOptionStyle(key: string): string {
    const base =
      "w-full text-left px-5 py-4 rounded-xl border transition-all duration-300 font-medium ";
    if (pageState !== "revealed") {
      return (
        base +
        "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-[#2563EB] cursor-pointer"
      );
    }
    if (key === correctAnswer)
      return (
        base + "border-green-500 bg-green-500/20 text-green-300 cursor-default"
      );
    if (key === selectedAnswer && key !== correctAnswer)
      return base + "border-red-500 bg-red-500/20 text-red-300 cursor-default";
    return base + "border-white/10 bg-white/5 text-white/30 cursor-default";
  }

  // ── RENDER ────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/60 tracking-wider">
            Loading today&apos;s challenge...
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">📅</p>
            <p className="text-white/60 mb-4">{errorMessage}</p>
            <Link
              href="/play"
              className="text-[#3b82f6] text-sm hover:underline"
            >
              Play the weekly quiz instead →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (pageState === "completed") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <div className="text-6xl mb-4">{alreadyCorrect ? "✅" : "📅"}</div>
            <h2 className="text-white font-serif text-2xl font-bold mb-2">
              {alreadyCorrect === null
                ? "You've already played today!"
                : alreadyCorrect
                  ? "You got it right!"
                  : "Better luck tomorrow!"}
            </h2>
            <p className="text-white/40 text-sm mb-6">
              Come back tomorrow for a new challenge
            </p>
            {dailyStreak > 0 && (
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-6">
                <span>🔥</span>
                <span className="text-amber-400 text-sm font-medium">
                  {dailyStreak} day streak
                </span>
              </div>
            )}
            <div className="space-y-3">
              <Link
                href="/play"
                className="block w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl text-center transition-colors"
              >
                Play the weekly quiz
              </Link>
              <Link
                href="/leaderboard"
                className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl text-center transition-colors"
              >
                View leaderboard
              </Link>
            </div>
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

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      <Navbar />

      {/* Daily challenge header strip */}
      <div className="border-b border-white/10 px-4 py-2 text-center">
        <span className="text-white/40 text-xs tracking-wider">
          📅 Daily Challenge ·{" "}
          {challenge && formatDate(challenge.challenge_date)}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Ready state — show intro before starting */}
          {pageState === "ready" && (
            <div className="text-center">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-white font-serif text-2xl font-bold mb-2">
                Daily Challenge
              </h2>
              <p className="text-white/40 text-sm mb-2">
                One question. 15 seconds. Can you get it right?
              </p>
              {dailyStreak > 0 && (
                <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
                  <span>🔥</span>
                  <span className="text-amber-400 text-sm">
                    {dailyStreak} day streak
                  </span>
                </div>
              )}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 text-left">
                <p className="text-white/40 text-xs mb-2 tracking-wider uppercase">
                  Today&apos;s question
                </p>
                <p className="text-white font-medium leading-relaxed">
                  {challenge?.question_text}
                </p>
              </div>
              <button
                onClick={handleStart}
                className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-4 rounded-xl transition-colors text-lg"
              >
                Start the challenge
              </button>
            </div>
          )}

          {/* Answering state */}
          {(pageState === "answering" || pageState === "revealed") && (
            <div>
              {/* Timer — only show while answering */}
              {pageState === "answering" && (
                <div className="mb-6">
                  <Timer
                    durationSeconds={15}
                    onTimeUp={handleTimeUp}
                    isRunning={timerRunning}
                  />
                </div>
              )}

              {/* Question */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
                <p className="text-white/40 text-xs mb-3 tracking-wider uppercase">
                  Daily Challenge
                </p>
                <h2 className="text-white text-xl font-semibold leading-relaxed mb-6">
                  {challenge?.question_text}
                </h2>

                <div className="space-y-3">
                  {options.map(({ key, text }) => (
                    <button
                      key={key}
                      onClick={() =>
                        pageState === "answering" && handleAnswer(key)
                      }
                      disabled={pageState === "revealed"}
                      className={getOptionStyle(key)}
                    >
                      <span className="text-white/50 mr-3 font-mono text-sm">
                        {key.toUpperCase()}.
                      </span>
                      {text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Result revealed */}
              {pageState === "revealed" && isCorrect !== null && (
                <div
                  className={`rounded-2xl p-5 text-center border ${
                    isCorrect
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <p className="text-3xl mb-2">{isCorrect ? "🎉" : "😔"}</p>
                  <p
                    className={`font-bold text-lg mb-1 ${isCorrect ? "text-green-400" : "text-red-400"}`}
                  >
                    {isCorrect ? "Correct!" : "Not quite!"}
                  </p>
                  {!isCorrect && correctAnswer && (
                    <p className="text-white/60 text-sm mb-2">
                      The correct answer was{" "}
                      <strong className="text-white">
                        {correctAnswer.toUpperCase()}
                      </strong>
                    </p>
                  )}
                  <p className="text-green-400 text-sm font-medium mb-4">
                    +{xpEarned} XP earned
                  </p>
                  {dailyStreak > 0 && (
                    <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-4">
                      <span>🔥</span>
                      <span className="text-amber-400 text-xs">
                        {dailyStreak} day streak
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Link
                      href="/play"
                      className="block w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl text-center transition-colors text-sm"
                    >
                      Play the weekly quiz
                    </Link>
                    <Link
                      href="/leaderboard"
                      className="block w-full bg-white/5 border border-white/10 text-white font-semibold py-2.5 rounded-xl text-center transition-colors text-sm"
                    >
                      View leaderboard
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
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
