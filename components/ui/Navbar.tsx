// components/ui/Navbar.tsx
// Shared navbar used across all game pages

"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserSupabaseClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(path: string) {
    return pathname === path;
  }

  return (
    <nav className="border-b border-white/10 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        {/* EED Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-[#2563EB] flex items-center justify-center">
            <span className="text-white font-serif text-xs font-bold tracking-wider">
              EED
            </span>
          </div>
          <span className="text-white font-serif font-bold">
            Book <span className="text-[#2563EB]">Jimmy&apos;s</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            href="/play"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive("/play")
                ? "bg-[#2563EB]/20 text-[#3b82f6]"
                : "text-white/50 hover:text-white"
            }`}
          >
            Play
          </Link>
          <Link
            href="/leaderboard"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive("/leaderboard")
                ? "bg-[#2563EB]/20 text-[#3b82f6]"
                : "text-white/50 hover:text-white"
            }`}
          >
            Scores
          </Link>
          <Link
            href="/hall-of-fame"
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isActive("/hall-of-fame")
                ? "bg-[#2563EB]/20 text-[#3b82f6]"
                : "text-white/50 hover:text-white"
            }`}
          >
            Champions
          </Link>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm text-white/30 hover:text-white/60 transition-colors ml-1"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
