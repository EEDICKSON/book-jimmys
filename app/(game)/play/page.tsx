// app/(game)/play/page.tsx
"use client";

import Navbar from "@/components/ui/Navbar";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import QuestionCard from "@/components/game/QuestionCard";
import Timer from "@/components/game/Timer";
import { SECONDS_PER_QUESTION, type AnsweredQuestion } from "@/lib/quiz-logic";

// The Question type without correct_answer (server strips it for security)
type SafeQuestion = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  week_number: number;
};

type GameState =
  | "loading"
  | "playing"
  | "answer_revealed"
  | "submitting"
  | "error";

export default function PlayPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<SafeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnsweredQuestion[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>("loading");
  const [questionStartTime, setQuestionStartTime] = useState<number>(
    Date.now(),
  );
  const [timerRunning, setTimerRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch questions when page loads
  useEffect(() => {
    async function loadQuestions() {
      try {
        const res = await fetch("/api/quiz");
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

    loadQuestions();
  }, []);

  // Called when player picks an answer OR time runs out
  const handleAnswer = useCallback(
    async (selectedKey: string | null) => {
      if (gameState !== "playing") return;

      setTimerRunning(false);
      setGameState("answer_revealed");

      // Calculate how long they took
      const secondsTaken = Math.min(
        Math.round((Date.now() - questionStartTime) / 1000),
        SECONDS_PER_QUESTION,
      );

      const currentQuestion = questions[currentIndex];
      setSelectedAnswer(selectedKey);

      // Ask the server: what was the correct answer?
      // We reveal it here for the visual feedback
      try {
        const res = await fetch(`/api/quiz/answer?id=${currentQuestion.id}`);
        const data = await res.json();
        setCorrectAnswer(data.correct_answer);

        // Record this answer
        const newAnswer: AnsweredQuestion = {
          questionId: currentQuestion.id,
          selectedAnswer: selectedKey,
          correctAnswer: data.correct_answer,
          isCorrect: selectedKey === data.correct_answer,
          secondsTaken,
        };

        const updatedAnswers = [...answers, newAnswer];
        setAnswers(updatedAnswers);

        // Wait 1.5 seconds so player sees the result
        setTimeout(async () => {
          if (currentIndex + 1 >= questions.length) {
            // Quiz is over — submit all answers
            await submitScore(updatedAnswers);
          } else {
            // Move to next question
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

  // Submit all answers to the server at the end
  async function submitScore(finalAnswers: AnsweredQuestion[]) {
    setGameState("submitting");
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to save score");
        setGameState("error");
        return;
      }

      // Pass results to the results page via URL params
      router.push(
        `/results?score=${data.score}&time=${data.timeTaken}&week=${data.weekNumber}`,
      );
    } catch {
      setErrorMessage("Failed to save your score. Please try again.");
      setGameState("error");
    }
  }

  // Time ran out — treat as no answer
  const handleTimeUp = useCallback(() => {
    handleAnswer(null);
  }, [handleAnswer]);

  // ── RENDER STATES ────────────────────────────────────────

  if (gameState === "loading") {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-[#2563EB] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-serif font-bold text-lg">EED</span>
          </div>
          <p className="text-white/60 text-sm tracking-wider">
            Loading this week's challenge...
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
            onClick={() => router.push("/login")}
            className="text-[#3b82f6] underline text-sm"
          >
            Go back to login
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
      {/* Navbar */}
      <Navbar />

      {/* Main quiz area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Timer */}
          <div className="mb-6">
            <Timer
              durationSeconds={SECONDS_PER_QUESTION}
              onTimeUp={handleTimeUp}
              isRunning={timerRunning}
            />
          </div>

          {/* Question card */}
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
      {/* EED Footer */}
      <footer className="border-t border-white/10 px-4 py-3 text-center">
        <p className="text-white/20 text-xs tracking-wider">
          Built for Liberia · © 2026 EED
        </p>
      </footer>
    </div>
  );
}
