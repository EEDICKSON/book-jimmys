"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import Timer from "@/components/game/Timer";
import Link from "next/link";
import { SECONDS_PER_QUESTION } from "@/lib/quiz-logic";
import { getCategoryById } from "@/lib/categories";
import {
  playCorrectSound,
  playWrongSound,
  playCompleteSound,
  playTimeUpSound,
} from "@/lib/sounds";

type ChallengeData = {
  id: string;
  challengerName: string;
  score: number;
  timeTakenSecs: number;
  category: string;
  weekNumber: number;
  expiresAt: string;
  isExpired: boolean;
};

type Attempt = {
  nickname: string;
  score: number;
  time_taken_secs: number;
  created_at: string;
};

type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  week_number: number;
  category: string;
};

type AnsweredQuestion = {
  questionId: string;
  selectedAnswer: string | null;
  secondsTaken: number;
};

type PageState =
  | "loading"
  | "preview"
  | "playing"
  | "answer_revealed"
  | "submitting"
  | "result"
  | "error"
  | "expired"
  | "already_attempted"
  | "own_challenge";

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ChallengePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    timeTakenSecs: number;
    won: boolean;
    challengerScore: number;
    challengerName: string;
    xpEarned: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadChallenge() {
      try {
        const res = await fetch(`/api/challenge/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || "Challenge not found");
          setPageState("error");
          return;
        }

        setChallenge(data.challenge);
        setAttempts(data.attempts || []);

        if (data.challenge.isExpired) {
          setPageState("expired");
          return;
        }
        if (data.isChallenger) {
          setPageState("own_challenge");
          return;
        }
        if (data.hasAttempted) {
          setPageState("already_attempted");
          return;
        }

        setPageState("preview");
      } catch {
        setErrorMessage("Failed to load challenge");
        setPageState("error");
      }
    }
    loadChallenge();
  }, [id]);

  async function startChallenge() {
    if (!challenge) return;
    try {
      const res = await fetch(`/api/quiz?category=${challenge.category}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage("Failed to load questions");
        setPageState("error");
        return;
      }
      setQuestions(data.questions);
      setPageState("playing");
      setTimerRunning(true);
      setStartTime(Date.now());
    } catch {
      setErrorMessage("Failed to load questions");
      setPageState("error");
    }
  }

  const handleAnswer = useCallback(
    async (selected: string | null) => {
      if (pageState !== "playing") return;
      setTimerRunning(false);
      setPageState("answer_revealed");
      setSelectedAnswer(selected);

      const secondsTaken = Math.min(
        Math.round((Date.now() - startTime) / 1000),
        SECONDS_PER_QUESTION,
      );
      const currentQ = questions[currentIndex];

      try {
        const res = await fetch(`/api/quiz/answer?id=${currentQ.id}`);
        const data = await res.json();
        setCorrectAnswer(data.correct_answer);

        const isCorrect = selected === data.correct_answer;
        if (isCorrect) playCorrectSound();
        else playWrongSound();

        const newAnswer: AnsweredQuestion = {
          questionId: currentQ.id,
          selectedAnswer: selected,
          secondsTaken,
        };
        const updatedAnswers = [...answers, newAnswer];
        setAnswers(updatedAnswers);

        setTimeout(async () => {
          if (currentIndex + 1 >= questions.length) {
            await submitAttempt(updatedAnswers);
          } else {
            setCurrentIndex((p) => p + 1);
            setSelectedAnswer(null);
            setCorrectAnswer(null);
            setPageState("playing");
            setTimerRunning(true);
            setStartTime(Date.now());
          }
        }, 1500);
      } catch {
        setErrorMessage("Connection error");
        setPageState("error");
      }
    },
    [pageState, startTime, questions, currentIndex, answers],
  );

  async function submitAttempt(finalAnswers: AnsweredQuestion[]) {
    setPageState("submitting");
    try {
      const res = await fetch(`/api/challenge/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to submit");
        setPageState("error");
        return;
      }
      playCompleteSound();
      setResult(data);
      setPageState("result");
    } catch {
      setErrorMessage("Failed to submit attempt");
      setPageState("error");
    }
  }

  const handleTimeUp = useCallback(() => {
    playTimeUpSound();
    handleAnswer(null);
  }, [handleAnswer]);

  function shareChallenge() {
    const url = `${window.location.origin}/challenge/${id}`;
    const text = `🎯 I challenge you on Book Jimmy's!\n\n${challenge?.challengerName} scored ${challenge?.score.toLocaleString()} points\n\nCan you beat me? You have 24 hours!\n\n${url}\n\nBuilt for Liberia 🇱🇷`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  const cat = challenge ? getCategoryById(challenge.category) : null;

  // ── LOADING ───────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/60">Loading challenge...</p>
        </div>
      </div>
    );
  }

  // ── EXPIRED ───────────────────────────────────────────
  if (pageState === "expired") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">⏰</p>
            <h2 className="text-white font-serif text-xl font-bold mb-2">
              Challenge expired
            </h2>
            <p className="text-white/40 text-sm mb-6">
              This challenge was only valid for 24 hours
            </p>
            <Link
              href="/play"
              className="block w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl text-center transition-colors"
            >
              Play the weekly quiz instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── OWN CHALLENGE ─────────────────────────────────────
  if (pageState === "own_challenge") {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/challenge/${id}`;
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">🎯</p>
            <h2 className="text-white font-serif text-xl font-bold mb-2">
              Your challenge is live!
            </h2>
            <p className="text-white/40 text-sm mb-6">
              Share this link with friends and dare them to beat your score
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
              <p className="text-white font-bold text-2xl mb-1">
                {challenge?.score.toLocaleString()}
              </p>
              <p className="text-white/40 text-xs">your score to beat</p>
            </div>
            <button
              onClick={shareChallenge}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition-colors mb-3"
            >
              📤 Share challenge on WhatsApp
            </button>
            {attempts.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                  {attempts.length} attempt{attempts.length > 1 ? "s" : ""}
                </p>
                {attempts.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-white/5"
                  >
                    <span className="text-white text-sm">{a.nickname}</span>
                    <span
                      className={`text-sm font-bold ${a.score > (challenge?.score || 0) ? "text-red-400" : "text-green-400"}`}
                    >
                      {a.score.toLocaleString()}{" "}
                      {a.score > (challenge?.score || 0) ? "👑" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ALREADY ATTEMPTED ─────────────────────────────────
  if (pageState === "already_attempted") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">✅</p>
            <h2 className="text-white font-serif text-xl font-bold mb-2">
              Already attempted!
            </h2>
            <p className="text-white/40 text-sm mb-6">
              You can only attempt each challenge once
            </p>
            <Link
              href="/play"
              className="block w-full bg-[#2563EB] text-white font-semibold py-3 rounded-xl text-center"
            >
              Play the weekly quiz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-red-400 mb-4">{errorMessage}</p>
            <Link
              href="/play"
              className="text-[#3b82f6] text-sm hover:underline"
            >
              Go to weekly quiz →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── PREVIEW ───────────────────────────────────────────
  if (pageState === "preview" && challenge) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <p className="text-4xl mb-3">🎯</p>
              <h1 className="text-white font-serif text-2xl font-bold mb-1">
                Friend Challenge
              </h1>
              <p className="text-white/40 text-sm">You have been challenged!</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-4 text-center">
                Score to beat
              </p>
              <div className="text-center mb-4">
                <p className="text-white font-serif text-5xl font-bold">
                  {challenge.score.toLocaleString()}
                </p>
                <p className="text-white/40 text-sm mt-1">
                  points by {challenge.challengerName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center border-t border-white/10 pt-4">
                <div>
                  <p className="text-white/40 text-xs mb-1">Category</p>
                  <p className="text-white font-medium text-sm">
                    {cat?.emoji} {cat?.name}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Their time</p>
                  <p className="text-white font-medium text-sm">
                    {formatTime(challenge.timeTakenSecs)}
                  </p>
                </div>
              </div>
            </div>

            {attempts.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                  {attempts.length} attempt{attempts.length > 1 ? "s" : ""} so
                  far
                </p>
                {attempts.slice(0, 3).map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white/60 text-sm">{a.nickname}</span>
                    <span
                      className={`text-sm font-bold ${a.score > challenge.score ? "text-amber-400" : "text-white/60"}`}
                    >
                      {a.score.toLocaleString()}{" "}
                      {a.score > challenge.score ? "👑" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5 text-center">
              <p className="text-amber-400 text-xs">
                ⏰ Expires{" "}
                {new Date(challenge.expiresAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <button
              onClick={startChallenge}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-4 rounded-xl transition-colors text-lg"
            >
              Accept challenge — play now!
            </button>
            <p className="text-white/20 text-xs text-center mt-3">
              +50 XP for accepting · 10 questions
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBMITTING ────────────────────────────────────────
  if (pageState === "submitting") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <p className="text-white/60">Calculating your score...</p>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────
  if (pageState === "result" && result) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <p className="text-6xl mb-4">{result.won ? "🏆" : "😤"}</p>
            <h2 className="text-white font-serif text-2xl font-bold mb-1">
              {result.won ? "You won!" : "So close!"}
            </h2>
            <p className="text-white/40 text-sm mb-6">
              {result.won
                ? `You beat ${result.challengerName}!`
                : `${result.challengerName} still holds the lead`}
            </p>

            {/* Score comparison */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-xl ${result.won ? "bg-green-500/10 border border-green-500/20" : "bg-white/5"}`}
                >
                  <p className="text-white/40 text-xs mb-1">Your score</p>
                  <p
                    className={`text-3xl font-bold font-serif ${result.won ? "text-green-400" : "text-white"}`}
                  >
                    {result.score.toLocaleString()}
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    {formatTime(result.timeTakenSecs)}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-xl ${!result.won ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/5"}`}
                >
                  <p className="text-white/40 text-xs mb-1">
                    {result.challengerName}
                  </p>
                  <p
                    className={`text-3xl font-bold font-serif ${!result.won ? "text-amber-400" : "text-white"}`}
                  >
                    {result.challengerScore.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-green-400 text-sm font-medium mt-4">
                +{result.xpEarned} XP earned
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={shareChallenge}
                className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition-colors"
              >
                📤 Challenge someone else
              </button>
              <Link
                href="/play"
                className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl text-center transition-colors"
              >
                Play the weekly quiz
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────
  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      <Navbar />

      <div className="border-b border-white/10 px-4 py-2 text-center">
        <span className="text-white/40 text-xs tracking-wider">
          🎯 Challenge from {challenge?.challengerName} · {cat?.emoji}{" "}
          {cat?.name}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <Timer
              durationSeconds={SECONDS_PER_QUESTION}
              onTimeUp={handleTimeUp}
              isRunning={timerRunning}
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="mb-4">
              <p className="text-white/40 text-xs mb-1">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <h2 className="text-white text-lg font-semibold leading-relaxed">
                {currentQ?.question_text}
              </h2>
            </div>

            <div className="space-y-3">
              {(["a", "b", "c", "d"] as const).map((opt) => {
                const text = currentQ?.[
                  `option_${opt}` as keyof Question
                ] as string;
                let style =
                  "bg-white/5 border border-white/10 text-white hover:bg-white/10 cursor-pointer";
                if (pageState === "answer_revealed") {
                  if (opt === correctAnswer)
                    style =
                      "bg-green-500/20 border border-green-500 text-green-300 cursor-default";
                  else if (opt === selectedAnswer)
                    style =
                      "bg-red-500/20 border border-red-500 text-red-300 cursor-default";
                  else
                    style =
                      "bg-white/5 border border-white/10 text-white/30 cursor-default";
                }
                return (
                  <button
                    key={opt}
                    onClick={() => pageState === "playing" && handleAnswer(opt)}
                    disabled={pageState === "answer_revealed"}
                    className={`w-full text-left px-5 py-3 rounded-xl transition-all text-sm font-medium ${style}`}
                  >
                    <span className="text-white/40 mr-3 font-mono">
                      {opt.toUpperCase()}.
                    </span>
                    {text}
                  </button>
                );
              })}
            </div>
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
("use client");

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import Timer from "@/components/game/Timer";
import Link from "next/link";
import { SECONDS_PER_QUESTION } from "@/lib/quiz-logic";
import { getCategoryById } from "@/lib/categories";
import {
  playCorrectSound,
  playWrongSound,
  playCompleteSound,
  playTimeUpSound,
} from "@/lib/sounds";

type ChallengeData = {
  id: string;
  challengerName: string;
  score: number;
  timeTakenSecs: number;
  category: string;
  weekNumber: number;
  expiresAt: string;
  isExpired: boolean;
};

type Attempt = {
  nickname: string;
  score: number;
  time_taken_secs: number;
  created_at: string;
};

type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  week_number: number;
  category: string;
};

type AnsweredQuestion = {
  questionId: string;
  selectedAnswer: string | null;
  secondsTaken: number;
};

type PageState =
  | "loading"
  | "preview"
  | "playing"
  | "answer_revealed"
  | "submitting"
  | "result"
  | "error"
  | "expired"
  | "already_attempted"
  | "own_challenge";

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function ChallengePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [result, setResult] = useState<{
    score: number;
    timeTakenSecs: number;
    won: boolean;
    challengerScore: number;
    challengerName: string;
    xpEarned: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadChallenge() {
      try {
        const res = await fetch(`/api/challenge/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorMessage(data.error || "Challenge not found");
          setPageState("error");
          return;
        }

        setChallenge(data.challenge);
        setAttempts(data.attempts || []);

        if (data.challenge.isExpired) {
          setPageState("expired");
          return;
        }
        if (data.isChallenger) {
          setPageState("own_challenge");
          return;
        }
        if (data.hasAttempted) {
          setPageState("already_attempted");
          return;
        }

        setPageState("preview");
      } catch {
        setErrorMessage("Failed to load challenge");
        setPageState("error");
      }
    }
    loadChallenge();
  }, [id]);

  async function startChallenge() {
    if (!challenge) return;
    try {
      const res = await fetch(`/api/quiz?category=${challenge.category}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage("Failed to load questions");
        setPageState("error");
        return;
      }
      setQuestions(data.questions);
      setPageState("playing");
      setTimerRunning(true);
      setStartTime(Date.now());
    } catch {
      setErrorMessage("Failed to load questions");
      setPageState("error");
    }
  }

  const handleAnswer = useCallback(
    async (selected: string | null) => {
      if (pageState !== "playing") return;
      setTimerRunning(false);
      setPageState("answer_revealed");
      setSelectedAnswer(selected);

      const secondsTaken = Math.min(
        Math.round((Date.now() - startTime) / 1000),
        SECONDS_PER_QUESTION,
      );
      const currentQ = questions[currentIndex];

      try {
        const res = await fetch(`/api/quiz/answer?id=${currentQ.id}`);
        const data = await res.json();
        setCorrectAnswer(data.correct_answer);

        const isCorrect = selected === data.correct_answer;
        if (isCorrect) playCorrectSound();
        else playWrongSound();

        const newAnswer: AnsweredQuestion = {
          questionId: currentQ.id,
          selectedAnswer: selected,
          secondsTaken,
        };
        const updatedAnswers = [...answers, newAnswer];
        setAnswers(updatedAnswers);

        setTimeout(async () => {
          if (currentIndex + 1 >= questions.length) {
            await submitAttempt(updatedAnswers);
          } else {
            setCurrentIndex((p) => p + 1);
            setSelectedAnswer(null);
            setCorrectAnswer(null);
            setPageState("playing");
            setTimerRunning(true);
            setStartTime(Date.now());
          }
        }, 1500);
      } catch {
        setErrorMessage("Connection error");
        setPageState("error");
      }
    },
    [pageState, startTime, questions, currentIndex, answers],
  );

  async function submitAttempt(finalAnswers: AnsweredQuestion[]) {
    setPageState("submitting");
    try {
      const res = await fetch(`/api/challenge/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to submit");
        setPageState("error");
        return;
      }
      playCompleteSound();
      setResult(data);
      setPageState("result");
    } catch {
      setErrorMessage("Failed to submit attempt");
      setPageState("error");
    }
  }

  const handleTimeUp = useCallback(() => {
    playTimeUpSound();
    handleAnswer(null);
  }, [handleAnswer]);

  function shareChallenge() {
    const url = `${window.location.origin}/challenge/${id}`;
    const text = `🎯 I challenge you on Book Jimmy's!\n\n${challenge?.challengerName} scored ${challenge?.score.toLocaleString()} points\n\nCan you beat me? You have 24 hours!\n\n${url}\n\nBuilt for Liberia 🇱🇷`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  const cat = challenge ? getCategoryById(challenge.category) : null;

  // ── LOADING ───────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/60">Loading challenge...</p>
        </div>
      </div>
    );
  }

  // ── EXPIRED ───────────────────────────────────────────
  if (pageState === "expired") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">⏰</p>
            <h2 className="text-white font-serif text-xl font-bold mb-2">
              Challenge expired
            </h2>
            <p className="text-white/40 text-sm mb-6">
              This challenge was only valid for 24 hours
            </p>
            <Link
              href="/play"
              className="block w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl text-center transition-colors"
            >
              Play the weekly quiz instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── OWN CHALLENGE ─────────────────────────────────────
  if (pageState === "own_challenge") {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/challenge/${id}`;
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">🎯</p>
            <h2 className="text-white font-serif text-xl font-bold mb-2">
              Your challenge is live!
            </h2>
            <p className="text-white/40 text-sm mb-6">
              Share this link with friends and dare them to beat your score
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
              <p className="text-white font-bold text-2xl mb-1">
                {challenge?.score.toLocaleString()}
              </p>
              <p className="text-white/40 text-xs">your score to beat</p>
            </div>
            <button
              onClick={shareChallenge}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition-colors mb-3"
            >
              📤 Share challenge on WhatsApp
            </button>
            {attempts.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">
                  {attempts.length} attempt{attempts.length > 1 ? "s" : ""}
                </p>
                {attempts.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-white/5"
                  >
                    <span className="text-white text-sm">{a.nickname}</span>
                    <span
                      className={`text-sm font-bold ${a.score > (challenge?.score || 0) ? "text-red-400" : "text-green-400"}`}
                    >
                      {a.score.toLocaleString()}{" "}
                      {a.score > (challenge?.score || 0) ? "👑" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ALREADY ATTEMPTED ─────────────────────────────────
  if (pageState === "already_attempted") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-4xl mb-4">✅</p>
            <h2 className="text-white font-serif text-xl font-bold mb-2">
              Already attempted!
            </h2>
            <p className="text-white/40 text-sm mb-6">
              You can only attempt each challenge once
            </p>
            <Link
              href="/play"
              className="block w-full bg-[#2563EB] text-white font-semibold py-3 rounded-xl text-center"
            >
              Play the weekly quiz
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ─────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <p className="text-red-400 mb-4">{errorMessage}</p>
            <Link
              href="/play"
              className="text-[#3b82f6] text-sm hover:underline"
            >
              Go to weekly quiz →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── PREVIEW ───────────────────────────────────────────
  if (pageState === "preview" && challenge) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <p className="text-4xl mb-3">🎯</p>
              <h1 className="text-white font-serif text-2xl font-bold mb-1">
                Friend Challenge
              </h1>
              <p className="text-white/40 text-sm">You have been challenged!</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-4 text-center">
                Score to beat
              </p>
              <div className="text-center mb-4">
                <p className="text-white font-serif text-5xl font-bold">
                  {challenge.score.toLocaleString()}
                </p>
                <p className="text-white/40 text-sm mt-1">
                  points by {challenge.challengerName}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center border-t border-white/10 pt-4">
                <div>
                  <p className="text-white/40 text-xs mb-1">Category</p>
                  <p className="text-white font-medium text-sm">
                    {cat?.emoji} {cat?.name}
                  </p>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Their time</p>
                  <p className="text-white font-medium text-sm">
                    {formatTime(challenge.timeTakenSecs)}
                  </p>
                </div>
              </div>
            </div>

            {attempts.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
                  {attempts.length} attempt{attempts.length > 1 ? "s" : ""} so
                  far
                </p>
                {attempts.slice(0, 3).map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-white/60 text-sm">{a.nickname}</span>
                    <span
                      className={`text-sm font-bold ${a.score > challenge.score ? "text-amber-400" : "text-white/60"}`}
                    >
                      {a.score.toLocaleString()}{" "}
                      {a.score > challenge.score ? "👑" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-5 text-center">
              <p className="text-amber-400 text-xs">
                ⏰ Expires{" "}
                {new Date(challenge.expiresAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <button
              onClick={startChallenge}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-4 rounded-xl transition-colors text-lg"
            >
              Accept challenge — play now!
            </button>
            <p className="text-white/20 text-xs text-center mt-3">
              +50 XP for accepting · 10 questions
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── SUBMITTING ────────────────────────────────────────
  if (pageState === "submitting") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <p className="text-white/60">Calculating your score...</p>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────
  if (pageState === "result" && result) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center">
            <p className="text-6xl mb-4">{result.won ? "🏆" : "😤"}</p>
            <h2 className="text-white font-serif text-2xl font-bold mb-1">
              {result.won ? "You won!" : "So close!"}
            </h2>
            <p className="text-white/40 text-sm mb-6">
              {result.won
                ? `You beat ${result.challengerName}!`
                : `${result.challengerName} still holds the lead`}
            </p>

            {/* Score comparison */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-xl ${result.won ? "bg-green-500/10 border border-green-500/20" : "bg-white/5"}`}
                >
                  <p className="text-white/40 text-xs mb-1">Your score</p>
                  <p
                    className={`text-3xl font-bold font-serif ${result.won ? "text-green-400" : "text-white"}`}
                  >
                    {result.score.toLocaleString()}
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    {formatTime(result.timeTakenSecs)}
                  </p>
                </div>
                <div
                  className={`p-4 rounded-xl ${!result.won ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/5"}`}
                >
                  <p className="text-white/40 text-xs mb-1">
                    {result.challengerName}
                  </p>
                  <p
                    className={`text-3xl font-bold font-serif ${!result.won ? "text-amber-400" : "text-white"}`}
                  >
                    {result.challengerScore.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-green-400 text-sm font-medium mt-4">
                +{result.xpEarned} XP earned
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={shareChallenge}
                className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition-colors"
              >
                📤 Challenge someone else
              </button>
              <Link
                href="/play"
                className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-3 rounded-xl text-center transition-colors"
              >
                Play the weekly quiz
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────
  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      <Navbar />

      <div className="border-b border-white/10 px-4 py-2 text-center">
        <span className="text-white/40 text-xs tracking-wider">
          🎯 Challenge from {challenge?.challengerName} · {cat?.emoji}{" "}
          {cat?.name}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="mb-6">
            <Timer
              durationSeconds={SECONDS_PER_QUESTION}
              onTimeUp={handleTimeUp}
              isRunning={timerRunning}
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="mb-4">
              <p className="text-white/40 text-xs mb-1">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <h2 className="text-white text-lg font-semibold leading-relaxed">
                {currentQ?.question_text}
              </h2>
            </div>

            <div className="space-y-3">
              {(["a", "b", "c", "d"] as const).map((opt) => {
                const text = currentQ?.[
                  `option_${opt}` as keyof Question
                ] as string;
                let style =
                  "bg-white/5 border border-white/10 text-white hover:bg-white/10 cursor-pointer";
                if (pageState === "answer_revealed") {
                  if (opt === correctAnswer)
                    style =
                      "bg-green-500/20 border border-green-500 text-green-300 cursor-default";
                  else if (opt === selectedAnswer)
                    style =
                      "bg-red-500/20 border border-red-500 text-red-300 cursor-default";
                  else
                    style =
                      "bg-white/5 border border-white/10 text-white/30 cursor-default";
                }
                return (
                  <button
                    key={opt}
                    onClick={() => pageState === "playing" && handleAnswer(opt)}
                    disabled={pageState === "answer_revealed"}
                    className={`w-full text-left px-5 py-3 rounded-xl transition-all text-sm font-medium ${style}`}
                  >
                    <span className="text-white/40 mr-3 font-mono">
                      {opt.toUpperCase()}.
                    </span>
                    {text}
                  </button>
                );
              })}
            </div>
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
