"use client";

import ChampionCard from "@/components/admin/ChampionCard";
import AnalyticsTab from "@/components/admin/AnalyticsTab";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getCurrentWeekNumber } from "@/lib/quiz-logic";
import { LEVELS } from "@/lib/xp-system";

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
  category: string;
  created_at: string;
};

type AdminUser = {
  id: string;
  nickname: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  last_played: number | null;
  totalPlays: number;
  created_at: string;
};

type DailyChallenge = {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  challenge_date: string;
  category: string;
};

type ChampionData = {
  nickname: string;
  score: number;
  timeTakenSecs: number;
  weekNumber: number;
  county: string | null;
  crowned_at: string;
};

const CATEGORY_OPTIONS = [
  { value: "general", label: "🇱🇷 General Knowledge" },
  { value: "history", label: "📜 History" },
  { value: "geography", label: "🗺️ Geography" },
  { value: "culture", label: "🎭 Culture & People" },
  { value: "sports", label: "⚽ Sports" },
  { value: "government", label: "⚖️ Government & Law" },
];

const EMPTY_FORM = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "a",
  week_number: getCurrentWeekNumber(),
  category: "general",
};

const EMPTY_DAILY_FORM = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_answer: "a",
  category: "general",
  challenge_date: new Date().toISOString().split("T")[0],
};

function Dropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
}: {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white text-sm text-left flex items-center justify-between hover:bg-white/15 transition-colors focus:outline-none focus:border-[#2563EB]"
      >
        <span className={selected ? "text-white" : "text-white/40"}>
          {selected?.label || placeholder}
        </span>
        <span
          className={`text-white/40 text-xs transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f2744] border border-white/20 rounded-xl overflow-hidden z-50 shadow-2xl max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-sm text-left transition-colors hover:bg-white/10 flex items-center justify-between ${value === opt.value ? "text-[#3b82f6] bg-[#2563EB]/10" : "text-white"}`}
            >
              {opt.label}
              {value === opt.value && <span className="text-[#3b82f6]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
            className={`flex-1 font-semibold py-2.5 rounded-xl transition-colors text-sm ${confirmStyle === "danger" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#2563EB] hover:bg-[#1d4ed8] text-white"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg ${type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
    >
      {type === "success" ? "✓ " : "✗ "}
      {message}
    </div>
  );
}

function QuestionForm({
  form,
  setForm,
  onSave,
  saving,
  saveLabel = "Add question",
}: {
  form: any;
  setForm: (f: any) => void;
  onSave: () => void;
  saving: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[#93c5fd] text-sm block mb-2">Category</label>
        <Dropdown
          value={form.category}
          onChange={(val) => setForm((f: any) => ({ ...f, category: val }))}
          options={CATEGORY_OPTIONS}
        />
      </div>
      <div>
        <label className="text-[#93c5fd] text-sm block mb-2">Question</label>
        <textarea
          value={form.question_text}
          onChange={(e) =>
            setForm((f: any) => ({ ...f, question_text: e.target.value }))
          }
          placeholder="Type your question here..."
          rows={3}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB] resize-none"
        />
      </div>
      {(["a", "b", "c", "d"] as const).map((opt) => (
        <div key={opt}>
          <label className="text-[#93c5fd] text-sm block mb-2 flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${form.correct_answer === opt ? "bg-green-500 text-white" : "bg-white/10 text-white/50"}`}
            >
              {opt.toUpperCase()}
            </span>
            Option {opt.toUpperCase()}
            {form.correct_answer === opt && (
              <span className="text-green-400 text-xs">✓ correct</span>
            )}
          </label>
          <input
            type="text"
            value={form[`option_${opt}`]}
            onChange={(e) =>
              setForm((f: any) => ({ ...f, [`option_${opt}`]: e.target.value }))
            }
            placeholder={`Option ${opt.toUpperCase()}`}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      ))}
      <div>
        <label className="text-[#93c5fd] text-sm block mb-2">
          Correct answer
        </label>
        <div className="flex gap-2">
          {(["a", "b", "c", "d"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() =>
                setForm((f: any) => ({ ...f, correct_answer: opt }))
              }
              className={`w-12 h-12 rounded-xl font-bold text-sm transition-colors ${form.correct_answer === opt ? "bg-green-500 text-white" : "bg-white/10 text-white/50 hover:bg-white/20 border border-white/20"}`}
            >
              {opt.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {saving ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  // ── ALL STATE INSIDE THE COMPONENT ───────────────────
  const [stats, setStats] = useState<Stats | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dailyForm, setDailyForm] = useState(EMPTY_DAILY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filterWeek, setFilterWeek] = useState(getCurrentWeekNumber());
  const [userSearch, setUserSearch] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "add" | "manage" | "daily" | "analytics" | "users"
  >("overview");
  const [deleteQuestionModal, setDeleteQuestionModal] =
    useState<Question | null>(null);
  const [deleteUserModal, setDeleteUserModal] = useState<AdminUser | null>(
    null,
  );
  const [deleteDailyModal, setDeleteDailyModal] =
    useState<DailyChallenge | null>(null);
  const [resetModal, setResetModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [lastChampion, setLastChampion] = useState<ChampionData | null>(null); // ← INSIDE component

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
    if (res.ok) setQuestions((await res.json()).questions);
  }

  async function loadUsers() {
    setLoadingUsers(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers((await res.json()).users);
    setLoadingUsers(false);
  }

  async function loadDailyChallenges() {
    const res = await fetch("/api/admin/daily");
    if (res.ok) setDailyChallenges((await res.json()).challenges);
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

  useEffect(() => {
    if (activeTab === "users" && users.length === 0) loadUsers();
    if (activeTab === "daily") loadDailyChallenges();
  }, [activeTab]);

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
      showToast("Question added!", "success");
      setForm(EMPTY_FORM);
      await loadStats();
      if (filterWeek === form.week_number) await loadQuestions();
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDaily() {
    setSavingDaily(true);
    try {
      const res = await fetch("/api/admin/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dailyForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to add challenge", "error");
        return;
      }
      showToast("Daily challenge added!", "success");
      const next = new Date(dailyForm.challenge_date);
      next.setDate(next.getDate() + 1);
      setDailyForm({
        ...EMPTY_DAILY_FORM,
        challenge_date: next.toISOString().split("T")[0],
      });
      await loadDailyChallenges();
    } catch {
      showToast("Something went wrong", "error");
    } finally {
      setSavingDaily(false);
    }
  }

  async function confirmDeleteQuestion() {
    if (!deleteQuestionModal) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/questions?id=${deleteQuestionModal.id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setQuestions((p) => p.filter((q) => q.id !== deleteQuestionModal.id));
        showToast("Question deleted", "success");
      } else showToast("Failed to delete", "error");
    } finally {
      setDeleting(false);
      setDeleteQuestionModal(null);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteUserModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?id=${deleteUserModal.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((p) => p.filter((u) => u.id !== deleteUserModal.id));
        await loadStats();
        showToast("User removed", "success");
      } else {
        const d = await res.json();
        showToast(d.error || "Failed", "error");
      }
    } finally {
      setDeleting(false);
      setDeleteUserModal(null);
    }
  }

  async function confirmDeleteDaily() {
    if (!deleteDailyModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/daily?id=${deleteDailyModal.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDailyChallenges((p) =>
          p.filter((d) => d.id !== deleteDailyModal.id),
        );
        showToast("Challenge deleted", "success");
      } else showToast("Failed to delete", "error");
    } finally {
      setDeleting(false);
      setDeleteDailyModal(null);
    }
  }

  async function confirmReset() {
    setResetting(true);
    setResetModal(false);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast(
          data.winner
            ? `Reset! ${data.winner} crowned with ${data.score} pts`
            : data.message || "Reset complete",
          "success",
        );
        await loadStats();
        if (data.winner) {
          setLastChampion({
            nickname: data.winner,
            score: data.score,
            timeTakenSecs: data.timeTaken,
            weekNumber: data.weekNumber,
            county: data.county,
            crowned_at: data.crowned_at,
          });
        }
      } else showToast(data.error || "Reset failed", "error");
    } catch {
      showToast("Reset failed", "error");
    } finally {
      setResetting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function getLevelInfo(level: number) {
    return LEVELS.find((l) => l.level === level) || LEVELS[0];
  }
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const filteredUsers = users.filter(
    (u) =>
      u.nickname.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <p className="text-white/60 tracking-wider">Loading dashboard...</p>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "add", label: "Add question" },
    { id: "manage", label: "Manage questions" },
    { id: "daily", label: "Daily challenges" },
    { id: "analytics", label: "📊 Analytics" },
    { id: "users", label: `Users ${stats ? `(${stats.totalUsers})` : ""}` },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0b1f3a]">
      {deleteQuestionModal && (
        <ConfirmModal
          title="Delete question"
          message={`Delete "${deleteQuestionModal.question_text}"? Cannot be undone.`}
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          onConfirm={confirmDeleteQuestion}
          onCancel={() => setDeleteQuestionModal(null)}
        />
      )}
      {deleteUserModal && (
        <ConfirmModal
          title="Remove user"
          message={`Remove ${deleteUserModal.nickname}? This deletes their account permanently.`}
          confirmLabel={deleting ? "Removing..." : "Remove"}
          onConfirm={confirmDeleteUser}
          onCancel={() => setDeleteUserModal(null)}
        />
      )}
      {deleteDailyModal && (
        <ConfirmModal
          title="Delete daily challenge"
          message={`Delete the challenge for ${deleteDailyModal.challenge_date}? Cannot be undone.`}
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          onConfirm={confirmDeleteDaily}
          onCancel={() => setDeleteDailyModal(null)}
        />
      )}
      {resetModal && (
        <ConfirmModal
          title="Manual weekly reset"
          message="Crown this week's winner and clear all scores. Cannot be undone."
          confirmLabel="Yes, reset now"
          onConfirm={confirmReset}
          onCancel={() => setResetModal(false)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}

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
        <div className="flex gap-2 mb-6 mt-4 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-[#2563EB] text-white" : "bg-white/5 text-white/50 hover:text-white border border-white/10"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ──────────────────────────────────── */}
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
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                >
                  <p className="text-white/40 text-xs mb-1 tracking-wider">
                    {s.label.toUpperCase()}
                  </p>
                  <p className={`text-2xl font-bold font-serif ${s.color}`}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-white/60 text-xs tracking-wider uppercase mb-4">
                Quick actions
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  onClick={() => setActiveTab("add")}
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  + Weekly question
                </button>
                <button
                  onClick={() => setActiveTab("daily")}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  📅 Daily challenge
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  👥 View users
                </button>
                <button
                  onClick={() => setResetModal(true)}
                  disabled={resetting}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50"
                >
                  {resetting ? "Resetting..." : "⚡ Weekly reset"}
                </button>
              </div>
            </div>
            {/* Champion card — appears automatically after weekly reset */}
            <ChampionCard champion={lastChampion} />
          </div>
        )}

        {/* ── ADD QUESTION ──────────────────────────────── */}
        {activeTab === "add" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-2xl">
            <h2 className="text-white font-semibold text-lg mb-2">
              Add weekly question
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
            <QuestionForm
              form={form}
              setForm={setForm}
              onSave={handleAddQuestion}
              saving={saving}
              saveLabel="Add weekly question"
            />
          </div>
        )}

        {/* ── MANAGE QUESTIONS ──────────────────────────── */}
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
                {questions.map((q, i) => (
                  <div
                    key={q.id}
                    className="bg-white/5 border border-white/10 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white/40 text-xs mb-1">
                          #{i + 1} · Week {q.week_number} · {q.category}
                        </p>
                        <p className="text-white text-sm font-medium mb-3 leading-relaxed">
                          {q.question_text}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(["a", "b", "c", "d"] as const).map((opt) => (
                            <div
                              key={opt}
                              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${q.correct_answer === opt ? "bg-green-500/20 text-green-300 border border-green-500/30" : "bg-white/5 text-white/50"}`}
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
                      <button
                        onClick={() => setDeleteQuestionModal(q)}
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

        {/* ── DAILY CHALLENGES ──────────────────────────── */}
        {activeTab === "daily" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-semibold text-lg mb-5">
                Add daily challenge
              </h2>
              <div className="mb-4">
                <label className="text-[#93c5fd] text-sm block mb-2">
                  Challenge date
                </label>
                <input
                  type="date"
                  value={dailyForm.challenge_date}
                  onChange={(e) =>
                    setDailyForm((f) => ({
                      ...f,
                      challenge_date: e.target.value,
                    }))
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#2563EB]"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <QuestionForm
                form={dailyForm}
                setForm={setDailyForm}
                onSave={handleAddDaily}
                saving={savingDaily}
                saveLabel="Add daily challenge"
              />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg mb-5">
                Scheduled challenges
                <span className="text-white/30 text-sm font-normal ml-2">
                  ({dailyChallenges.length})
                </span>
              </h2>
              {dailyChallenges.length === 0 ? (
                <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-white/40 text-sm">
                    No daily challenges scheduled yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {dailyChallenges.map((d) => {
                    const isToday =
                      d.challenge_date ===
                      new Date().toISOString().split("T")[0];
                    const isPast =
                      d.challenge_date < new Date().toISOString().split("T")[0];
                    return (
                      <div
                        key={d.id}
                        className={`bg-white/5 border rounded-xl p-4 ${isToday ? "border-[#2563EB]/40 bg-[#2563EB]/5" : "border-white/10"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p
                                className={`text-xs font-medium ${isToday ? "text-[#3b82f6]" : isPast ? "text-white/30" : "text-white/50"}`}
                              >
                                {isToday ? "📅 Today" : d.challenge_date}
                              </p>
                              <span className="text-white/20 text-xs">
                                · {d.category}
                              </span>
                            </div>
                            <p
                              className={`text-sm leading-relaxed ${isPast && !isToday ? "text-white/40" : "text-white"}`}
                            >
                              {d.question_text}
                            </p>
                            <p className="text-green-400/60 text-xs mt-1">
                              Answer: {d.correct_answer.toUpperCase()} —{" "}
                              {
                                d[
                                  `option_${d.correct_answer}` as keyof DailyChallenge
                                ]
                              }
                            </p>
                          </div>
                          <button
                            onClick={() => setDeleteDailyModal(d)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ─────────────────────────────────── */}
        {activeTab === "analytics" && <AnalyticsTab />}

        {/* ── USERS ─────────────────────────────────────── */}
        {activeTab === "users" && (
          <div>
            <div className="mb-5">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by nickname or email..."
                className="w-full max-w-sm bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#2563EB] text-sm"
              />
              <span className="text-white/40 text-sm ml-3">
                {filteredUsers.length} players
              </span>
            </div>
            {loadingUsers ? (
              <div className="text-center py-12">
                <p className="text-white/40 text-sm">Loading players...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/40 text-sm">No players found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user, index) => {
                  const lvl = getLevelInfo(user.level);
                  return (
                    <div
                      key={user.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-white/30 text-xs w-5 text-right flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-xl flex-shrink-0">
                            {lvl.badge}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-semibold text-sm">
                                {user.nickname}
                              </p>
                              <span className="text-xs text-[#3b82f6] bg-[#2563EB]/10 px-2 py-0.5 rounded-full">
                                Lv.{user.level} {lvl.name}
                              </span>
                              {user.streak > 1 && (
                                <span className="text-xs text-amber-400">
                                  🔥 {user.streak}w
                                </span>
                              )}
                            </div>
                            <p className="text-white/30 text-xs mt-0.5 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="hidden sm:flex items-center gap-4 text-right">
                            <div>
                              <p className="text-white text-sm font-semibold">
                                {user.xp.toLocaleString()}
                              </p>
                              <p className="text-white/30 text-xs">XP</p>
                            </div>
                            <div>
                              <p className="text-white text-sm font-semibold">
                                {user.totalPlays}
                              </p>
                              <p className="text-white/30 text-xs">plays</p>
                            </div>
                            <div>
                              <p className="text-white/40 text-xs">
                                {formatDate(user.created_at)}
                              </p>
                              <p className="text-white/20 text-xs">joined</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setDeleteUserModal(user)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
