// app/page.tsx
// The first page every visitor sees
// Public — no login required

import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Corner brackets */}
        <div className="relative inline-block mb-8">
          <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-brand-blue" />
          <div className="absolute -top-3 -right-3 w-6 h-6 border-t-2 border-r-2 border-brand-blue" />
          <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b-2 border-l-2 border-brand-blue" />
          <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-brand-blue" />

          {/* EED Monogram */}
          <div className="w-24 h-24 rounded-full border-2 border-brand-blue flex items-center justify-center mx-auto">
            <div className="w-20 h-20 rounded-full border border-brand-light/40 flex items-center justify-center bg-brand-blue/10">
              <span className="text-white font-serif font-bold text-2xl tracking-widest">
                EED
              </span>
            </div>
          </div>
        </div>

        {/* EED presents */}
        <p className="text-white/30 text-xs tracking-[4px] uppercase mb-3">
          EED presents
        </p>

        {/* Game title */}
        <h1 className="text-white font-serif text-5xl font-bold mb-2">
          Book <span className="text-brand-blue">Jimmy&apos;s</span>
        </h1>

        {/* Tagline */}
        <p className="text-brand-muted text-sm tracking-[3px] uppercase mb-2">
          Liberia Weekly Challenge
        </p>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 my-6">
          <div className="h-px w-12 bg-brand-blue/40" />
          <div className="w-1.5 h-1.5 bg-brand-blue rotate-45" />
          <div className="h-px w-12 bg-brand-blue/40" />
        </div>

        {/* Description */}
        <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-xs mx-auto">
          Test your knowledge. Compete every week. Rise on the leaderboard.
          Become a champion.
        </p>

        {/* CTAs */}
        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full bg-brand-blue hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-colors text-lg"
          >
            Join the Challenge
          </Link>
          <Link
            href="/login"
            className="block w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-semibold py-4 rounded-xl transition-colors"
          >
            I already have an account
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex justify-center gap-8 mt-10 pt-8 border-t border-white/10">
          <div>
            <p className="text-white font-bold text-xl">Weekly</p>
            <p className="text-white/30 text-xs mt-0.5">New questions</p>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <p className="text-white font-bold text-xl">Live</p>
            <p className="text-white/30 text-xs mt-0.5">Leaderboard</p>
          </div>
          <div className="w-px bg-white/10" />
          <div>
            <p className="text-white font-bold text-xl">&#127466;&#127479;</p>
            <p className="text-white/30 text-xs mt-0.5">Built for Liberia</p>
          </div>
        </div>

        {/* EED Footer */}
        <div className="mt-10">
          <p className="text-white/40 text-xs tracking-wider">
            Designed &amp; Built by{" "}
            <a
              href="https://eedickson.github.io/eed_portfolio/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-blue/50 hover:text-brand-blue transition-colors"
            >
              EED
            </a>{" "}
            &#183; &#169; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
