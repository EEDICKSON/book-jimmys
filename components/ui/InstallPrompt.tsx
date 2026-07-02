// components/ui/InstallPrompt.tsx
// Shows a banner prompting users to install the PWA
// Appears automatically when browser detects the app can be installed

"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user already dismissed this session
    if (sessionStorage.getItem("pwa-dismissed")) return;

    // Listen for the browser's install prompt event
    function handlePrompt(e: Event) {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setPrompt(null);
  }

  function handleDismiss() {
    setVisible(false);
    setDismissed(true);
    sessionStorage.setItem("pwa-dismissed", "1");
  }

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="bg-[#0f2744] border border-[#2563EB]/30 rounded-2xl p-4 shadow-2xl max-w-lg mx-auto">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="w-12 h-12 rounded-xl bg-[#0b1f3a] border border-[#2563EB]/30 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-serif font-bold text-sm">BJ</span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm mb-0.5">
              Install Book Jimmy&apos;s
            </p>
            <p className="text-white/50 text-xs leading-relaxed">
              Add to your home screen for quick access — no App Store needed
            </p>
          </div>

          <button
            onClick={handleDismiss}
            className="text-white/30 hover:text-white/60 flex-shrink-0 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleDismiss}
            className="flex-1 bg-white/10 hover:bg-white/15 text-white/60 font-medium py-2 rounded-xl text-sm transition-colors"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-2 rounded-xl text-sm transition-colors"
          >
            Install app
          </button>
        </div>
      </div>
    </div>
  );
}
