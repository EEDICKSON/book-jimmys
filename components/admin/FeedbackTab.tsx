// components/admin/FeedbackTab.tsx
"use client";

import { useEffect, useState } from "react";

type FeedbackEntry = {
  id: string;
  nickname: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

type FeedbackData = {
  feedback: FeedbackEntry[];
  totalCount: number;
  avgRating: number;
  distribution: { star: number; count: number }[];
};

function Stars({ rating }: { rating: number }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={s <= rating ? "text-amber-400" : "text-white/20"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FeedbackTab() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/feedback");
        if (!res.ok) throw new Error("Failed");
        setData(await res.json());
      } catch {
        setError("Failed to load feedback");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading)
    return (
      <div className="text-center py-16">
        <p className="text-white/40 text-sm">Loading feedback...</p>
      </div>
    );
  if (error || !data)
    return (
      <div className="text-center py-16">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );

  const maxCount = Math.max(...data.distribution.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-white/40 text-xs mb-1 tracking-wider">
            AVG RATING
          </p>
          <p className="text-amber-400 text-3xl font-bold font-serif">
            {data.avgRating}
          </p>
          <p className="text-white/30 text-xs mt-1">out of 5</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-white/40 text-xs mb-1 tracking-wider">
            TOTAL REVIEWS
          </p>
          <p className="text-white text-3xl font-bold font-serif">
            {data.totalCount}
          </p>
          <p className="text-white/30 text-xs mt-1">from players</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-white/40 text-xs mb-2 tracking-wider">OVERALL</p>
          <div className="flex justify-center gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((s) => (
              <span
                key={s}
                className={
                  s <= Math.round(data.avgRating)
                    ? "text-amber-400"
                    : "text-white/20"
                }
              >
                ★
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Rating distribution */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <p className="text-white/60 text-xs tracking-widest uppercase mb-4">
          Rating breakdown
        </p>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const item = data.distribution.find((d) => d.star === star);
            const count = item?.count ?? 0;
            const pct = Math.round((count / maxCount) * 100);
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="text-amber-400 text-sm w-4">{star}</span>
                <span className="text-amber-400 text-xs">★</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-white/40 text-xs w-6 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Individual feedback */}
      <div>
        <p className="text-white/60 text-xs tracking-widest uppercase mb-4">
          Player feedback{" "}
          {data.feedback.length > 0 && `(${data.feedback.length})`}
        </p>

        {data.feedback.length === 0 ? (
          <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-white/40 text-sm">No feedback yet</p>
            <p className="text-white/20 text-xs mt-1">
              Players can rate the app from their profile page
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.feedback.map((entry) => (
              <div
                key={entry.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Stars rating={entry.rating} />
                    <span className="text-white/60 text-sm font-medium">
                      {entry.nickname || "Anonymous"}
                    </span>
                  </div>
                  <span className="text-white/30 text-xs flex-shrink-0">
                    {formatDate(entry.created_at)}
                  </span>
                </div>
                {entry.comment && (
                  <p className="text-white/70 text-sm leading-relaxed">
                    {entry.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
