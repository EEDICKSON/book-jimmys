// components/game/CategorySelect.tsx
"use client";

import { useEffect, useState } from "react";
import { type CategoryId } from "@/lib/categories";

type DBCategory = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  is_active: boolean;
};

type Props = {
  selectedCategory: string;
  onSelect: (category: string) => void;
  onStart: () => void;
  loading: boolean;
};

export default function CategorySelect({
  selectedCategory,
  onSelect,
  onStart,
  loading,
}: Props) {
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (res.ok) {
          setCategories(data.categories);
          // Auto-select first category if none selected
          if (!selectedCategory && data.categories.length > 0) {
            onSelect(data.categories[0].id);
          }
        }
      } catch {
        /* fall back to empty */
      } finally {
        setFetching(false);
      }
    }
    load();
  }, []);

  const selected = categories.find((c) => c.id === selectedCategory);

  if (fetching) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-12">
        <p className="text-white/40 text-sm tracking-wider">
          Loading categories...
        </p>
      </div>
    );
  }

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
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "bg-[#2563EB] border-[#2563EB] shadow-lg scale-[1.02] text-white"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
              }`}
            >
              <div className="text-2xl mb-2">{cat.emoji}</div>
              <p className="font-semibold text-sm mb-0.5">{cat.name}</p>
              {cat.description && (
                <p
                  className={`text-xs leading-relaxed ${isSelected ? "opacity-80" : "text-white/40"}`}
                >
                  {cat.description}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Start button */}
      <button
        onClick={onStart}
        disabled={loading || !selectedCategory}
        className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
      >
        {loading
          ? "Loading questions..."
          : selected
            ? `Start ${selected.emoji} ${selected.name}`
            : "Select a category"}
      </button>
    </div>
  );
}
