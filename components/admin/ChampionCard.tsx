// components/admin/ChampionCard.tsx
// Generates a shareable champion announcement card
// Admin screenshots this and posts on WhatsApp/social media

"use client";

import { useEffect, useRef, useState } from "react";

type ChampionData = {
  nickname: string;
  score: number;
  timeTakenSecs: number;
  weekNumber: number;
  county: string | null;
  crowned_at: string;
};

type Props = {
  champion: ChampionData | null;
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function drawLiberiaFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const stripeH = h / 11;
  for (let i = 0; i < 11; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#BF0A30" : "#FFFFFF";
    ctx.fillRect(x, y + i * stripeH, w, stripeH);
  }
  const cw = w * 0.4;
  const ch = stripeH * 4;
  ctx.fillStyle = "#002868";
  ctx.fillRect(x, y, cw, ch);
  // Star
  const sx = x + cw / 2;
  const sy = y + ch / 2;
  const r = Math.min(cw, ch) * 0.28;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    i === 0
      ? ctx.moveTo(sx + radius * Math.cos(angle), sy + radius * Math.sin(angle))
      : ctx.lineTo(
          sx + radius * Math.cos(angle),
          sy + radius * Math.sin(angle),
        );
  }
  ctx.closePath();
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateChampionCard(data: ChampionData): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#0b1f3a";
  ctx.fillRect(0, 0, 1080, 1080);

  // Gold glow at top
  const glow = ctx.createRadialGradient(540, 0, 0, 540, 0, 500);
  glow.addColorStop(0, "rgba(245,158,11,0.15)");
  glow.addColorStop(1, "rgba(245,158,11,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1080);

  // Corner brackets
  const bSize = 55;
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  const corners = [
    [70, 70, 1, 1],
    [1010, 70, -1, 1],
    [70, 1010, 1, -1],
    [1010, 1010, -1, -1],
  ];
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * bSize, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * bSize);
    ctx.stroke();
  });

  // EED ring
  ctx.beginPath();
  ctx.arc(540, 155, 72, 0, Math.PI * 2);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(540, 155, 57, 0, Math.PI * 2);
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 30px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EED", 540, 155);

  // Crown emoji area
  ctx.font = "80px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("👑", 540, 250);

  // "WEEKLY CHAMPION" title
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.letterSpacing = "6px";
  ctx.fillText("WEEKLY CHAMPION", 540, 358);

  // Week label
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "18px system-ui, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText(`WEEK ${data.weekNumber}`, 540, 398);

  // Divider
  ctx.strokeStyle = "rgba(245,158,11,0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(180, 430);
  ctx.lineTo(900, 430);
  ctx.stroke();

  // Score card background
  ctx.fillStyle = "rgba(245,158,11,0.08)";
  ctx.strokeStyle = "rgba(245,158,11,0.2)";
  ctx.lineWidth = 1;
  roundRect(ctx, 120, 450, 840, 340, 24);
  ctx.fill();
  ctx.stroke();

  // Nickname
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 72px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.letterSpacing = "0px";

  // Truncate long nicknames
  const maxWidth = 780;
  let nickname = data.nickname;
  ctx.font = "bold 72px Georgia, serif";
  while (ctx.measureText(nickname).width > maxWidth && nickname.length > 3) {
    nickname = nickname.slice(0, -1);
  }
  if (nickname !== data.nickname) nickname += "...";
  ctx.fillText(nickname, 540, 480);

  // Score
  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 100px Georgia, serif";
  ctx.fillText(data.score.toLocaleString(), 540, 570);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "22px system-ui, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText("POINTS", 540, 678);

  // Stats row
  const statsY = 720;
  const statItems = [
    { label: "TIME", value: formatTime(data.timeTakenSecs) },
    { label: "WEEK", value: `Week ${data.weekNumber}` },
    ...(data.county
      ? [
          {
            label: "COUNTY",
            value: data.county
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
          },
        ]
      : []),
  ];

  const spacing = 1080 / (statItems.length + 1);
  statItems.forEach((stat, i) => {
    const sx = spacing * (i + 1);
    ctx.fillStyle = "#f59e0b";
    ctx.font = "14px system-ui, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(stat.label, sx, statsY);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.letterSpacing = "0px";
    ctx.fillText(stat.value, sx, statsY + 26);
  });

  // Liberian flag
  const flagW = 130,
    flagH = 78;
  drawLiberiaFlag(ctx, 540 - flagW / 2, 830, flagW, flagH);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(540 - flagW / 2, 830, flagW, flagH);

  // Call to action
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "22px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.letterSpacing = "0px";
  ctx.fillText("Think you can beat them? Play next week!", 540, 930);

  ctx.fillStyle = "#2563EB";
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText("book-jimmys.vercel.app", 540, 965);

  // EED signature
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillText("Built for Liberia · Designed by EED · © 2026", 540, 1010);

  return canvas.toDataURL("image/png");
}

export default function ChampionCard({ champion }: Props) {
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!champion) return;
    setGenerating(true);
    try {
      const url = await generateChampionCard(champion);
      setCardUrl(url);
    } catch (err) {
      console.error("Failed to generate card:", err);
    } finally {
      setGenerating(false);
    }
  }

  function handleDownload() {
    if (!cardUrl) return;
    const link = document.createElement("a");
    link.download = `bookjimmys-week${champion?.weekNumber}-champion.png`;
    link.href = cardUrl;
    link.click();
  }

  async function handleShare() {
    if (!cardUrl || !champion) return;
    const text = `🏆 Book Jimmy's Week ${champion.weekNumber} Champion!\n\n👑 ${champion.nickname}\n🎯 ${champion.score.toLocaleString()} points in ${formatTime(champion.timeTakenSecs)}\n\nCan you beat them next week?\n🎮 book-jimmys.vercel.app\nBuilt for Liberia by EED 🇱🇷`;
    try {
      const blob = await (await fetch(cardUrl)).blob();
      const file = new File([blob], `champion-week${champion.weekNumber}.png`, {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      handleDownload();
    }
  }

  if (!champion) return null;

  return (
    <div className="bg-white/5 border border-amber-500/20 rounded-2xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">👑</span>
        <h3 className="text-amber-400 font-semibold text-lg">
          Week {champion.weekNumber} Champion
        </h3>
      </div>

      {/* Champion summary */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-xl">{champion.nickname}</p>
            {champion.county && (
              <p className="text-white/40 text-xs mt-0.5">
                📍{" "}
                {champion.county
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-amber-400 font-bold text-2xl">
              {champion.score.toLocaleString()}
            </p>
            <p className="text-white/40 text-xs">
              points · {formatTime(champion.timeTakenSecs)}
            </p>
          </div>
        </div>
      </div>

      {/* Card preview or generate button */}
      {!cardUrl ? (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors mb-3"
        >
          {generating
            ? "⏳ Generating announcement card..."
            : "🎨 Generate shareable card"}
        </button>
      ) : (
        <div>
          <img
            src={cardUrl}
            alt="Champion card"
            className="w-full rounded-xl mb-3 border border-amber-500/20"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleShare}
              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {copied ? "✓ Text copied!" : "📤 Share to WhatsApp"}
            </button>
            <button
              onClick={handleDownload}
              className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              💾 Download PNG
            </button>
          </div>
        </div>
      )}

      <p className="text-white/20 text-xs text-center mt-3">
        Screenshot or download and share on WhatsApp, Facebook, and social media
      </p>
    </div>
  );
}
