// components/admin/CategoriesTab.tsx
"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

const BUILT_IN = [
  "general",
  "history",
  "geography",
  "culture",
  "sports",
  "government",
];

const EMOJI_OPTIONS = [
  "🎯",
  "🌍",
  "🏆",
  "⭐",
  "🎓",
  "🔥",
  "💡",
  "🎭",
  "📚",
  "⚽",
  "🏅",
  "🎪",
  "🌟",
  "🦁",
  "🎵",
  "🏛️",
  "⚖️",
  "🗺️",
  "📜",
  "🇱🇷",
  "🌺",
  "🎊",
  "🏟️",
  "⚡",
  "🌍",
  "🏆",
  "🎯",
  "🥇",
  "🌐",
  "🎖️",
  "🏅",
  "🎗️",
  "🌎",
  "🤝",
  "🦅",
  "🎺",
];

export default function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [deleteModal, setDeleteModal] = useState<Category | null>(null);

  const [form, setForm] = useState({
    name: "",
    emoji: "🎯",
    description: "",
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      if (res.ok) setCategories((await res.json()).categories);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create");
        return;
      }
      showToast(`✓ "${form.name}" category created!`);
      setForm({ name: "", emoji: "🎯", description: "" });
      await load();
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(cat: Category) {
    try {
      await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cat.id, is_active: !cat.is_active }),
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id ? { ...c, is_active: !c.is_active } : c,
        ),
      );
      showToast(`✓ ${cat.name} ${!cat.is_active ? "enabled" : "hidden"}`);
    } catch {
      setError("Failed to update");
    }
  }

  async function handleDelete(cat: Category) {
    try {
      const res = await fetch(`/api/admin/categories?id=${cat.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showToast(`✓ "${cat.name}" deleted`);
    } catch {
      setError("Failed to delete");
    } finally {
      setDeleteModal(null);
    }
  }

  if (loading)
    return (
      <div className="text-center py-16">
        <p className="text-white/40 text-sm">Loading categories...</p>
      </div>
    );

  const activeCount = categories.filter((c) => c.is_active).length;
  const customCats = categories.filter((c) => !BUILT_IN.includes(c.id));
  const builtInCats = categories.filter((c) => BUILT_IN.includes(c.id));

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium bg-green-500 text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* Delete modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div className="bg-[#0f2744] border border-white/20 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold text-lg mb-2">
              Delete category
            </h3>
            <p className="text-white/60 text-sm mb-6">
              Delete{" "}
              <strong className="text-white">
                {deleteModal.emoji} {deleteModal.name}
              </strong>
              ? Questions tagged with this category will still exist but
              won&apos;t appear in any quiz until reassigned.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 bg-white/10 border border-white/20 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteModal)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create new category */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="text-white font-semibold text-lg mb-1">
          Create new category
        </h2>
        <p className="text-white/40 text-xs mb-5">
          For example: World Cup 2026, Liberian Music, Bible Trivia, University
          Challenge
        </p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="space-y-4">
          {/* Emoji picker */}
          <div>
            <label className="text-[#93c5fd] text-sm block mb-2">
              Choose emoji{" "}
              <span className="text-white/30">(represents the category)</span>
            </label>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">{form.emoji}</span>
              <span className="text-white/40 text-sm">selected</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, emoji }))}
                  className={`text-xl p-1.5 rounded-lg transition-all ${
                    form.emoji === emoji
                      ? "bg-[#2563EB] scale-110"
                      : "bg-white/5 hover:bg-white/15"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-[#93c5fd] text-sm block mb-2">
              Category name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. World Cup 2026"
              maxLength={40}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB]"
            />
            {form.name && (
              <p className="text-white/30 text-xs mt-1">
                ID will be:{" "}
                <code className="text-white/50">
                  {form.name
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, "")
                    .replace(/\s+/g, "_")
                    .slice(0, 30)}
                </code>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-[#93c5fd] text-sm block mb-2">
              Description{" "}
              <span className="text-white/30">
                (optional — shown to players)
              </span>
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="e.g. Questions about the 2026 FIFA World Cup"
              maxLength={80}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={saving || !form.name.trim()}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {saving
              ? "Creating..."
              : `Create ${form.emoji} ${form.name || "category"}`}
          </button>
        </div>
      </div>

      {/* Custom categories */}
      <div>
        <h3 className="text-white/60 text-xs tracking-widest uppercase mb-3">
          Your custom categories ({customCats.length})
        </h3>
        {customCats.length === 0 ? (
          <div className="bg-white/5 border border-white/10 border-dashed rounded-xl p-6 text-center">
            <p className="text-white/30 text-sm">No custom categories yet</p>
            <p className="text-white/20 text-xs mt-1">
              Create your first one above — like World Cup 2026!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {customCats.map((cat) => (
              <div
                key={cat.id}
                className={`border rounded-xl p-4 flex items-center justify-between gap-3 transition-opacity ${cat.is_active ? "bg-white/5 border-white/10" : "bg-white/3 border-white/5 opacity-60"}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">
                        {cat.name}
                      </p>
                      {!cat.is_active && (
                        <span className="text-xs text-white/30 bg-white/10 px-2 py-0.5 rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>
                    {cat.description && (
                      <p className="text-white/40 text-xs mt-0.5 truncate">
                        {cat.description}
                      </p>
                    )}
                    <p className="text-white/20 text-xs mt-0.5">ID: {cat.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggle(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      cat.is_active
                        ? "bg-white/10 text-white/60 hover:bg-white/15"
                        : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    }`}
                  >
                    {cat.is_active ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => setDeleteModal(cat)}
                    className="px-3 py-1.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Built-in categories */}
      <div>
        <h3 className="text-white/60 text-xs tracking-widest uppercase mb-3">
          Built-in categories ({builtInCats.length}) · {activeCount} active
          total
        </h3>
        <div className="space-y-2">
          {builtInCats.map((cat) => (
            <div
              key={cat.id}
              className={`border rounded-xl p-4 flex items-center justify-between gap-3 ${cat.is_active ? "bg-white/5 border-white/10" : "bg-white/3 border-white/5 opacity-50"}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.emoji}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-sm">{cat.name}</p>
                    {!cat.is_active && (
                      <span className="text-xs text-white/30 bg-white/10 px-2 py-0.5 rounded-full">
                        Hidden
                      </span>
                    )}
                  </div>
                  {cat.description && (
                    <p className="text-white/40 text-xs mt-0.5">
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleToggle(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  cat.is_active
                    ? "bg-white/10 text-white/60 hover:bg-white/15"
                    : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                }`}
              >
                {cat.is_active ? "Hide" : "Show"}
              </button>
            </div>
          ))}
        </div>
        <p className="text-white/20 text-xs mt-2">
          Built-in categories cannot be deleted — only hidden from players
        </p>
      </div>
    </div>
  );
}
