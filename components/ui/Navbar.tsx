"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createBrowserSupabaseClient();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(path: string) {
    return pathname === path;
  }

  const links = [
    { href: "/daily", label: "📅 Daily" },
    { href: "/play", label: "Weekly" },
    { href: "/leaderboard", label: "Scores" },
    { href: "/hall-of-fame", label: "Champions" },
    { href: "/profile", label: "Profile" },
  ];

  return (
    <nav className="border-b border-white/10 px-4 py-3">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-[#2563EB] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-serif text-xs font-bold tracking-wider">
              EED
            </span>
          </div>
          <span className="text-white font-serif font-bold">
            Book <span className="text-[#2563EB]">Jimmy&apos;s</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive(link.href)
                  ? "bg-[#2563EB]/20 text-[#3b82f6]"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg text-sm text-white/30 hover:text-white/60 transition-colors ml-1"
          >
            Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden flex flex-col gap-1.5 p-2"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-white/60 transition-all ${menuOpen ? "rotate-45 translate-y-2" : ""}`}
          />
          <span
            className={`block w-5 h-0.5 bg-white/60 transition-all ${menuOpen ? "opacity-0" : ""}`}
          />
          <span
            className={`block w-5 h-0.5 bg-white/60 transition-all ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden border-t border-white/10 mt-3 pt-3 flex flex-col gap-1 max-w-lg mx-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(link.href)
                  ? "bg-[#2563EB]/20 text-[#3b82f6]"
                  : "text-white/50"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="px-3 py-2.5 rounded-lg text-sm text-white/30 text-left"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
