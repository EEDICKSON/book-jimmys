"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import QuestionCard from "@/components/game/QuestionCard";
import Timer from "@/components/game/Timer";
import CategorySelect from "@/components/game/CategorySelect";
import { SECONDS_PER_QUESTION, type AnsweredQuestion } from "@/lib/quiz-logic";
import { type CategoryId } from "@/lib/categories";
import {
  playCorrectSound,
  playWrongSound,
  playCompleteSound,
  playTimeUpSound,
} from "@/lib/sounds";

type SafeQuestion = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  week_number: number;
  category: string;
};

type GameState =
  | "selecting" // Player choosing category
  | "loading" // Fetching questions
  | "playing" // Quiz in progress
  | "answer_revealed" // Showing correct/wrong
  | "submitting" // Saving score
  | "error";

export default function PlayPage() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryId>("general");
  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>("selecting");
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now(),
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Called when player clicks Start
  async function handleStartQuiz() {
    setGameState("loading");
    try {
      const res = await fetch(`/api/quiz?category=${selectedCategory}`);
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to load questions");
        setGameState("error");
        return;
      }

      setQuestions(data.questions);
      setGameState("playing");
      setTimerRunning(true);
      setQuestionStartTime(Date.now());
    } catch {
      setErrorMessage("Could not connect. Please check your connection.");
      setGameState("error");
    }
  }

  const handleAnswer = useCallback(
    async (selectedKey: string | null) => {
      if (gameState !== "playing") return;

      setTimerRunning(false);
      setGameState("answer_revealed");

      const secondsTaken = Math.min(
        Math.round((Date.now() - questionStartTime) / 1000),
        SECONDS_PER_QUESTION,
      );

      const currentQuestion = questions[currentIndex];
      setSelectedAnswer(selectedKey);

      try {
        const res = await fetch(`/api/quiz/answer?id=${currentQuestion.id}`);
        const data = await res.json();
        setCorrectAnswer(data.correct_answer);

        const isCorrect = selectedKey === data.correct_answer;
        if (isCorrect) {
          playCorrectSound();
        } else {
          playWrongSound();
        }

        const newAnswer: AnsweredQuestion = {
          questionId: currentQuestion.id,
          selectedAnswer: selectedKey,
          correctAnswer: data.correct_answer,
          isCorrect,
          secondsTaken,
        };

        const updatedAnswers = [...answers, newAnswer];
        setAnswers(updatedAnswers);

        setTimeout(async () => {
          if (currentIndex + 1 >= questions.length) {
            await submitScore(updatedAnswers);
          } else {
            setCurrentIndex((prev) => prev + 1);
            setSelectedAnswer(null);
            setCorrectAnswer(null);
            setGameState("playing");
            setTimerRunning(true);
            setQuestionStartTime(Date.now());
          }
        }, 1500);
      } catch {
        setErrorMessage("Connection error. Please try again.");
        setGameState("error");
      }
    },
    [gameState, questionStartTime, questions, currentIndex, answers],
  );

  async function submitScore(finalAnswers: AnsweredQuestion[]) {
    setGameState("submitting");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: finalAnswers,
          category: selectedCategory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to save score");
        setGameState("error");
        return;
      }

      playCompleteSound();
      await new Promise((resolve) => setTimeout(resolve, 900));

      router.push(
        `/results?score=${data.score}&time=${data.timeTaken}&week=${data.weekNumber}&category=${selectedCategory}`,
      );
    } catch {
      setErrorMessage("Failed to save your score. Please try again.");
      setGameState("error");
    }
  }

  const handleTimeUp = useCallback(() => {
    playTimeUpSound();
    handleAnswer(null);
  }, [handleAnswer]);

  // ── RENDER STATES ─────────────────────────────────────

  // Category selection screen
  if (gameState === "selecting") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <CategorySelect
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
            onStart={handleStartQuiz}
            loading={false}
          />
        </div>
        <footer className="border-t border-white/10 px-4 py-3 text-center">
          <p className="text-white/20 text-xs tracking-wider">
            Built for Liberia · © 2026 EED
          </p>
        </footer>
      </div>
    );
  }

  if (gameState === "loading") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-[#2563EB] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-serif font-bold text-lg">EED</span>
          </div>
          <p className="text-white/60 text-sm tracking-wider">
            Loading questions...
          </p>
        </div>
      </div>
    );
  }

  if (gameState === "error") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-red-400 text-lg mb-4">{errorMessage}</p>
          <button
            onClick={() => setGameState("selecting")}
            className="text-[#3b82f6] underline text-sm"
          >
            Go back and try again
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "submitting") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <p className="text-white/60 tracking-wider">
          Calculating your score...
        </p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      <Navbar />

      {/* Category indicator */}
      <div className="border-b border-white/10 px-4 py-2 flex items-center justify-center gap-2">
        <span className="text-white/40 text-xs tracking-wider">
          Week {questions[0]?.week_number} ·
        </span>
        <span className="text-white/60 text-xs">
          {questions[0]?.category?.charAt(0).toUpperCase() +
            (questions[0]?.category?.slice(1) || "")}{" "}
          category
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
            <QuestionCard
              question={currentQuestion as any}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              selectedAnswer={selectedAnswer}
              correctAnswer={correctAnswer}
              onAnswer={handleAnswer}
            />
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
