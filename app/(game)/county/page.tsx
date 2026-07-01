// app/(game)/county/page.tsx
// Lets a player set their county — shown after registration
// and accessible from their profile

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { COUNTIES } from "@/lib/counties";

export default function CountyPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [currentCounty, setCurrentCounty] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentCounty() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("county")
        .eq("id", user.id)
        .single();

      if (profile?.county) {
        setCurrentCounty(profile.county);
        setSelectedCounty(profile.county);
      }
      setLoading(false);
    }
    loadCurrentCounty();
  }, []);

  async function handleSave() {
    if (!selectedCounty) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("users")
        .update({ county: selectedCounty })
        .eq("id", user.id);

      if (error) throw error;

      setCurrentCounty(selectedCounty);
      setSuccess(true);
      setTimeout(() => {
        router.push("/leaderboard");
      }, 1500);
    } catch (err) {
      console.error("Failed to save county:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1f3a] flex items-center justify-center">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1f3a] flex flex-col">
      <Navbar />

      <div className="flex-1 p-4 max-w-lg mx-auto w-full">
        <div className="mt-6 mb-6 text-center">
          <h1 className="text-white font-serif text-2xl font-bold mb-2">
            Your County
          </h1>
          <p className="text-white/40 text-sm">
            Select your county to compete on the county leaderboard
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-green-400 font-medium">
              ✓ County saved! Taking you to the leaderboard...
            </p>
          </div>
        )}

        {/* Current county indicator */}
        {currentCounty && !success && (
          <div className="bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-xl p-3 mb-4 text-center">
            <p className="text-[#3b82f6] text-sm">
              Currently representing:{" "}
              <strong>
                {COUNTIES.find((c) => c.id === currentCounty)?.name}
              </strong>
            </p>
          </div>
        )}

        {/* County grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {COUNTIES.map((county) => (
            <button
              key={county.id}
              onClick={() => setSelectedCounty(county.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedCounty === county.id
                  ? "bg-[#2563EB] border-[#2563EB] text-white scale-[1.02]"
                  : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
              }`}
            >
              <p className="font-semibold text-sm">{county.name}</p>
              <p
                className={`text-xs mt-0.5 ${
                  selectedCounty === county.id
                    ? "text-white/70"
                    : "text-white/30"
                }`}
              >
                {county.capital}
              </p>
            </button>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!selectedCounty || saving || success}
          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? "Saving..." : success ? "Saved!" : "Represent this county"}
        </button>

        <p className="text-center text-white/20 text-xs mt-4">
          You can change your county at any time
        </p>
      </div>

      <footer className="border-t border-white/10 px-4 py-3 text-center">
        <p className="text-white/20 text-xs tracking-wider">
          Built for Liberia · © 2026 EED
        </p>
      </footer>
    </div>
  );
}
