// components/game/FeedbackModal.tsx
"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
};

export default function FeedbackModal({ onClose }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const starLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent!"];
  const activeRating = hovered || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0f2744] border border-white/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        {submitted ? (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">🎉</p>
            <h3 className="text-white font-semibold text-lg mb-1">
              Thank you!
            </h3>
            <p className="text-white/50 text-sm">
              Your feedback helps us improve Book Jimmy&apos;s
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-semibold text-lg">
                  Rate Book Jimmy&apos;s
                </h3>
                <p className="text-white/40 text-xs mt-0.5">
                  Help us improve for Liberia
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white/60 text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Star rating */}
            <div className="flex items-center justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="text-4xl transition-transform hover:scale-110 focus:outline-none"
                >
                  {star <= activeRating ? "⭐" : "☆"}
                </button>
              ))}
            </div>

            {/* Star label */}
            <p
              className={`text-center text-sm mb-5 h-5 transition-all ${activeRating > 0 ? "text-amber-400" : "text-transparent"}`}
            >
              {starLabels[activeRating]}
            </p>

            {/* Comment */}
            <div className="mb-4">
              <label className="text-white/50 text-xs block mb-2">
                Tell us more (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What do you love? What could be better?"
                rows={3}
                maxLength={300}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[#2563EB] resize-none"
              />
              <p className="text-white/20 text-xs text-right mt-1">
                {comment.length}/300
              </p>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm mb-3 text-center">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
