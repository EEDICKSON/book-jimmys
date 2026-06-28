// components/game/Timer.tsx
"use client";

import { useEffect, useState } from "react";
import { playTickSound } from "@/lib/sounds";

type TimerProps = {
  durationSeconds: number;
  onTimeUp: () => void;
  isRunning: boolean;
};

export default function Timer({
  durationSeconds,
  onTimeUp,
  isRunning,
}: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  useEffect(() => {
    if (isRunning) {
      setSecondsLeft(durationSeconds);
    }
  }, [isRunning, durationSeconds]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();
          return 0;
        }
        // Play tick sound when 5 seconds or less remain
        if (prev <= 6) {
          playTickSound();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, onTimeUp]);

  const percentLeft = (secondsLeft / durationSeconds) * 100;

  const barColor =
    percentLeft > 50
      ? "bg-[#2563EB]"
      : percentLeft > 25
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white/60 text-sm">Time remaining</span>
        <span
          className={`font-bold text-lg ${percentLeft <= 25 ? "text-red-400" : "text-white"}`}
        >
          {secondsLeft}s
        </span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${percentLeft}%` }}
        />
      </div>
    </div>
  );
}
