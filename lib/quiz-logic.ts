// lib/quiz-logic.ts
// Pure functions — no database, no UI, just logic
// "Pure" means: same input always gives same output
// Easy to test, easy to understand

export const QUESTIONS_PER_QUIZ = 5;
export const SECONDS_PER_QUESTION = 15;
export const BASE_POINTS = 100;
export const TIME_BONUS_PER_SECOND = 5;

// Calculates points for a single answer
// If wrong or no answer → 0
// If correct → base points + time bonus
export function calculateQuestionScore(
  isCorrect: boolean,
  secondsTaken: number,
): number {
  if (!isCorrect) return 0;

  const timeBonus =
    Math.max(0, SECONDS_PER_QUESTION - secondsTaken) * TIME_BONUS_PER_SECOND;
  return BASE_POINTS + timeBonus;
}

// Calculates the total score across all answers
export function calculateTotalScore(answers: AnsweredQuestion[]): number {
  return answers.reduce((total, answer) => {
    return (
      total + calculateQuestionScore(answer.isCorrect, answer.secondsTaken)
    );
  }, 0);
  // reduce() = loop through array and accumulate a single value
  // starts at 0, adds each question's score one by one
}

// Calculates total time taken across all questions
export function calculateTotalTime(answers: AnsweredQuestion[]): number {
  return answers.reduce((total, answer) => total + answer.secondsTaken, 0);
}

// Gets the current week number of the year
// Used to tag scores and fetch the right questions
export function getCurrentWeekNumber(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 +
      startOfYear.getDay() +
      1) /
      7,
  );
  return weekNumber;
}

// TypeScript type — the shape of one answered question
export type AnsweredQuestion = {
  questionId: string;
  selectedAnswer: string | null; // null = player ran out of time
  correctAnswer: string;
  isCorrect: boolean;
  secondsTaken: number;
};
