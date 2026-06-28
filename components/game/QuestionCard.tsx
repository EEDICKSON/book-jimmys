// components/game/QuestionCard.tsx
// Displays one question with four answer buttons
// Handles the visual feedback: green for correct, red for wrong

"use client";

import { Question } from "@/types";

type QuestionCardProps = {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  correctAnswer: string | null; // Only revealed after answering
  onAnswer: (answer: string) => void;
};

// What colour should each button show?
function getButtonStyle(
  option: string,
  selectedAnswer: string | null,
  correctAnswer: string | null,
): string {
  const base =
    "w-full text-left px-5 py-4 rounded-xl border transition-all duration-300 font-medium ";

  // Nothing selected yet — show neutral
  if (!selectedAnswer) {
    return (
      base +
      "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-[#2563EB] cursor-pointer"
    );
  }

  // Answer has been submitted — reveal results
  if (option === correctAnswer) {
    return (
      base + "border-green-500 bg-green-500/20 text-green-300 cursor-default"
    );
  }

  if (option === selectedAnswer && option !== correctAnswer) {
    return base + "border-red-500 bg-red-500/20 text-red-300 cursor-default";
  }

  // Other options — dim them out
  return base + "border-white/10 bg-white/5 text-white/30 cursor-default";
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  correctAnswer,
  onAnswer,
}: QuestionCardProps) {
  const options = [
    { key: "a", text: question.option_a },
    { key: "b", text: question.option_b },
    { key: "c", text: question.option_c },
    { key: "d", text: question.option_d },
  ];

  return (
    <div className="w-full">
      {/* Question counter */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[#3b82f6] text-sm font-medium tracking-wider uppercase">
          Question {questionNumber} of {totalQuestions}
        </span>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < questionNumber - 1
                  ? "bg-[#2563EB]"
                  : i === questionNumber - 1
                    ? "bg-white"
                    : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* The question itself */}
      <h2 className="text-white text-xl font-semibold leading-relaxed mb-6">
        {question.question_text}
      </h2>

      {/* Answer options */}
      <div className="space-y-3">
        {options.map(({ key, text }) => (
          <button
            key={key}
            onClick={() => !selectedAnswer && onAnswer(key)}
            className={getButtonStyle(key, selectedAnswer, correctAnswer)}
            disabled={!!selectedAnswer}
          >
            <span className="text-white/50 mr-3 font-mono text-sm">
              {key.toUpperCase()}.
            </span>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
