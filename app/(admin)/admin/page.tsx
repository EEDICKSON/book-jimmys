"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";

type Stats = {
  totalUsers: number;
  totalQuestions: number;
  weeklyPlays: number;
  totalChampions: number;
  averageScore: number;
  weekNumber: number;
};

type Question = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  week_number: number;
  created_at: string;
};

const EMPTY_FORM = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "a",
  week_number: getCurrentWeekNumber(),
};

// ── MODAL COMPONENT ──────────────────────────────────────
function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  confirmStyle = "danger",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmStyle?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div className="bg-[#0f2744] border border-white/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-white/60 text-sm mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-semibold py-2.5 rounded-xl transition-colors text-sm ${
              confirmStyle === "danger"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SUCCESS / ERROR TOAST ─────────────────────────────────
function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg ${
        type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      {type === "success" ? "✓ " : "✗ "}
      {message}
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [stats, setStats] = useState<Stats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "add" | "manage">(
    "overview",
  );
  const [filterWeek, setFilterWeek] = useState(getCurrentWeekNumber());

  // Modal state
  const [deleteModal, setDeleteModal] = useState<Question | null>(null);
  const [resetModal, setResetModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadStats() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
  }

  async function loadQuestions() {
    const res = await fetch(`/api/admin/questions?week=${filterWeek}`);
    if (res.ok) {
      const data = await res.json();
      setQuestions(data.questions);
    }
  }

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadStats(), loadQuestions()]);
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [filterWeek]);

  async function handleAddQuestion() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to add question", "error");
        return;
      }
      showToast("Question added successfully", "success");
      setForm(EMPTY_FORM);
      await loadStats();
      if (filterWeek === form.week_number) await loadQuestions();
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/questions?id=${deleteModal.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setQuestions((prev) => prev.filter((q) => q.id !== deleteModal.id));
        await loadStats();
        showToast("Question deleted", "success");
      } else {
        showToast("Failed to delete question", "error");
      }
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  }

  async function confirmReset() {
    setResetting(true);
    setResetModal(false);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.winner) {
          showToast(
            `Reset complete! ${data.winner} crowned with ${data.score} points`,
            "success",
          );
        } else {
          showToast(
            data.message || "Reset complete — no scores this week",
            "success",
          );
        }
        await loadStats();
      } else {
        showToast(data.error || "Reset failed", "error");
      }
    } catch {
      showToast("Reset failed — try again", "error");
    } finally {
      setResetting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <p className="text-white/60 tracking-wider">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1f3a]">
      {/* Modals */}
      {deleteModal && (
        <ConfirmModal
          title="Delete question"
          message={`Are you sure you want to delete this question? This cannot be undone.\n\n"${deleteModal.question_text}"`}
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          confirmStyle="danger"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {resetModal && (
        <ConfirmModal
          title="Manual weekly reset"
          message="This will crown the current week's top scorer, add them to the Hall of Fame, and clear all scores. This action cannot be undone. Are you sure?"
          confirmLabel="Yes, reset now"
          confirmStyle="danger"
          onConfirm={confirmReset}
          onCancel={() => setResetModal(false)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Navbar */}
      <nav className="border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full border border-[#2563EB] flex items-center justify-center">
              <span className="text-white font-serif text-xs font-bold">
                EED
              </span>
            </div>
            <span className="text-white font-serif font-bold">
              Book <span className="text-[#2563EB]">Jimmy&apos;s</span>
            </span>
            <span className="text-xs bg-[#2563EB]/20 text-[#3b82f6] px-2 py-0.5 rounded-full">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-white/40 text-sm hover:text-white">
              View site
            </Link>
            <button
              onClick={handleLogout}
              className="text-white/30 text-sm hover:text-white/60"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 mt-4">
          {(["overview", "add", "manage"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-[#2563EB] text-white"
                  : "bg-white/5 text-white/50 hover:text-white border border-white/10"
              }`}
            >
              {tab === "overview"
                ? "Overview"
                : tab === "add"
                  ? "Add question"
                  : "Manage questions"}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────── */}
        {activeTab === "overview" && stats && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {[
                {
                  label: "Total users",
                  value: stats.totalUsers.toLocaleString(),
                  color: "text-[#3b82f6]",
                },
                {
                  label: "This week plays",
                  value: stats.weeklyPlays.toLocaleString(),
                  color: "text-green-400",
                },
                {
                  label: "Questions (week)",
                  value: stats.totalQuestions.toLocaleString(),
                  color: "text-amber-400",
                },
                {
                  label: "Hall of fame",
                  value: stats.totalChampions.toLocaleString(),
                  color: "text-purple-400",
                },
                {
                  label: "Average score",
                  value: stats.averageScore.toLocaleString(),
                  color: "text-white",
                },
                {
                  label: "Current week",
                  value: `Week ${stats.weekNumber}`,
                  color: "text-white/60",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                >
                  <p className="text-white/40 text-xs mb-1 tracking-wider">
                    {stat.label.toUpperCase()}
                  </p>
                  <p className={`text-2xl font-bold font-serif ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-white/60 text-xs tracking-wider uppercase mb-4">
                Quick actions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setActiveTab("add")}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  + Add question
                </button>
                <button
                  onClick={() => setActiveTab("manage")}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Manage questions
                </button>
                <button
                  onClick={() => setResetModal(true)}
                  disabled={resetting}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50"
                >
                  {resetting ? "Resetting..." : "Manual weekly reset"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD QUESTION ──────────────────────────────── */}
        {activeTab === "add" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-2xl">
            <h2 className="text-white font-semibold text-lg mb-6">
              Add new question
            </h2>

            <div className="mb-4">
              <label className="text-[#93c5fd] text-sm block mb-2">
                Week number
              </label>
              <input
                type="number"
                value={form.week_number}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    week_number: parseInt(e.target.value),
                  }))
                }
                className="w-32 bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="mb-4">
              <label className="text-[#93c5fd] text-sm block mb-2">
                Question
              </label>
              <textarea
                value={form.question_text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, question_text: e.target.value }))
                }
                placeholder="What is the capital city of Liberia?"
                rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB] resize-none"
              />
            </div>

            {(["a", "b", "c", "d"] as const).map((opt) => (
              <div key={opt} className="mb-3">
                <label className="text-[#93c5fd] text-sm block mb-2 flex items-center gap-2">
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                      form.correct_answer === opt
                        ? "bg-green-500 text-white"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {opt.toUpperCase()}
                  </span>
                  Option {opt.toUpperCase()}
                  {form.correct_answer === opt && (
                    <span className="text-green-400 text-xs">
                      ✓ correct answer
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={form[`option_${opt}` as keyof typeof form] as string}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [`option_${opt}`]: e.target.value,
                    }))
                  }
                  placeholder={`Option ${opt.toUpperCase()}`}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            ))}

            <div className="mb-6">
              <label className="text-[#93c5fd] text-sm block mb-2">
                Correct answer
              </label>
              <div className="flex gap-2">
                {(["a", "b", "c", "d"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() =>
                      setForm((f) => ({ ...f, correct_answer: opt }))
                    }
                    className={`w-12 h-12 rounded-xl font-bold text-sm transition-colors ${
                      form.correct_answer === opt
                        ? "bg-green-500 text-white"
                        : "bg-white/10 text-white/50 hover:bg-white/20 border border-white/20"
                    }`}
                  >
                    {opt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddQuestion}
              disabled={saving}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? "Saving..." : "Add question"}
            </button>
          </div>
        )}

        {/* ── MANAGE QUESTIONS ─────────────────────────── */}
        {activeTab === "manage" && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <label className="text-white/60 text-sm">Week:</label>
              <input
                type="number"
                value={filterWeek}
                onChange={(e) => setFilterWeek(parseInt(e.target.value))}
                className="w-24 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2563EB] text-sm"
              />
              <span className="text-white/40 text-sm">
                {questions.length} questions
              </span>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 text-sm mb-3">
                  No questions for week {filterWeek}
                </p>
                <button
                  onClick={() => {
                    setForm((f) => ({ ...f, week_number: filterWeek }));
                    setActiveTab("add");
                  }}
                  className="text-[#3b82f6] text-sm hover:underline"
                >
                  Add the first question →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white/40 text-xs mb-1">
                          #{index + 1} · Week {q.week_number}
                        </p>
                        <p className="text-white text-sm font-medium mb-3 leading-relaxed">
                          {q.question_text}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(["a", "b", "c", "d"] as const).map((opt) => (
                            <div
                              key={opt}
                              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${
                                q.correct_answer === opt
                                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                                  : "bg-white/5 text-white/50"
                              }`}
                            >
                              <span className="font-bold">
                                {opt.toUpperCase()}.
                              </span>
                              <span className="truncate">
                                {q[`option_${opt}` as keyof Question] as string}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Professional delete button */}
                      <button
                        onClick={() => setDeleteModal(q)}
                        className="flex-shrink-0 mt-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 px-4 py-3 text-center mt-8">
        <p className="text-white/20 text-xs tracking-wider">
          Book Jimmy&apos;s Admin · Built for Liberia · © 2026 EED
        </p>
      </footer>
    </div>
  );
}
