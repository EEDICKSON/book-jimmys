// components/game/Timer.tsx
// A visual countdown bar that shrinks from full to empty
// Turns red when time is running low — creates urgency

"use client";

import { useEffect, useState } from "react";

type TimerProps = {
  durationSeconds: number; // How long the timer runs (15)
  onTimeUp: () => void; // Function to call when timer hits zero
  isRunning: boolean; // Pause the timer between questions
};

export default function Timer({
  durationSeconds,
  onTimeUp,
  isRunning,
}: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  // Reset the timer every time isRunning changes to true
  // This happens when a new question appears
  useEffect(() => {
    if (isRunning) {
      setSecondsLeft(durationSeconds);
    }
  }, [isRunning, durationSeconds]);

  // The countdown interval
  useEffect(() => {
    if (!isRunning) return; // Don't tick if paused

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp(); // Tell the parent: time is up!
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // Tick every 1000 milliseconds = 1 second

    // Cleanup: stop the interval when the component unmounts
    // or when isRunning changes
    return () => clearInterval(interval);
  }, [isRunning, onTimeUp]);

  // How full is the bar? 0% to 100%
  const percentLeft = (secondsLeft / durationSeconds) * 100;

  // Change color based on urgency
  const barColor =
    percentLeft > 50
      ? "bg-[#2563EB]" // Blue — plenty of time
      : percentLeft > 25
        ? "bg-amber-500" // Amber — hurry up
        : "bg-red-500"; // Red — almost out of time

  return (
    <div className="w-full">
      {/* Time remaining label */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-white/60 text-sm">Time remaining</span>
        <span
          className={`font-bold text-lg ${
            percentLeft <= 25 ? "text-red-400" : "text-white"
          }`}
        >
          {secondsLeft}s
        </span>
      </div>

      {/* The progress bar */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${percentLeft}%` }}
        />
      </div>
    </div>
  );
}
