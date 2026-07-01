// components/game/CategorySelect.tsx
// Shown before the quiz starts — player picks their category

"use client";

import { CATEGORIES, type CategoryId } from "@/lib/categories";

type CategorySelectProps = {
  selectedCategory: CategoryId;
  onSelect: (category: CategoryId) => void;
  onStart: () => void;
  loading: boolean;
};

export default function CategorySelect({
  selectedCategory,
  onSelect,
  onStart,
  loading,
}: CategorySelectProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-white font-serif text-xl font-bold mb-1">
          Choose your category
        </h2>
        <p className="text-white/40 text-sm">
          Select a topic then start the challenge
        </p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id as CategoryId)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedCategory === cat.id
                ? cat.activeColor + " border-transparent shadow-lg scale-[1.02]"
                : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
            }`}
          >
            <div className="text-2xl mb-2">{cat.emoji}</div>
            <p className="font-semibold text-sm mb-0.5">{cat.name}</p>
            <p
              className={`text-xs leading-relaxed ${
                selectedCategory === cat.id ? "opacity-80" : "text-white/40"
              }`}
            >
              {cat.description}
            </p>
          </button>
        ))}
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={loading}
        className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
      >
        {loading
          ? "Loading questions..."
          : `Start ${CATEGORIES.find((c) => c.id === selectedCategory)?.name} Quiz`}
      </button>
    </div>
  );
}
