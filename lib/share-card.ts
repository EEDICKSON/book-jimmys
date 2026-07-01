// lib/share-card.ts
// Generates a shareable image card using HTML Canvas
// Runs entirely in the browser — no server, no API, no cost

export type ShareCardData = {
  nickname: string;
  score: number;
  timeTakenSecs: number;
  weekNumber: number;
  rank: number;
  totalPlayers: number;
  rating: string;
};

// Format seconds into readable time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

// Draw the Liberian flag (11 stripes + blue canton + star)
function drawLiberiaFlag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const stripeHeight = height / 11;

  for (let i = 0; i < 11; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#BF0A30" : "#FFFFFF";
    ctx.fillRect(x, y + i * stripeHeight, width, stripeHeight);
  }

  // Blue canton (top left — covers 4 stripes high, 40% wide)
  const cantonW = width * 0.4;
  const cantonH = stripeHeight * 4;
  ctx.fillStyle = "#002868";
  ctx.fillRect(x, y, cantonW, cantonH);

  // White star in canton center
  const starX = x + cantonW / 2;
  const starY = y + cantonH / 2;
  const starR = Math.min(cantonW, cantonH) * 0.3;
  drawStar(ctx, starX, starY, 5, starR, starR * 0.4, "#FFFFFF");
}

// Draw a 5-pointed star
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  points: number,
  outerR: number,
  innerR: number,
  color: string,
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// Main function — generates the card as a data URL
export async function generateShareCard(data: ShareCardData): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d")!;

  // ── BACKGROUND ──────────────────────────────────────────
  ctx.fillStyle = "#0b1f3a";
  ctx.fillRect(0, 0, 1080, 1080);

  // ── CORNER BRACKETS ─────────────────────────────────────
  const bracketSize = 60;
  const bracketThickness = 4;
  ctx.strokeStyle = "#2563EB";
  ctx.lineWidth = bracketThickness;
  ctx.lineCap = "round";

  const corners = [
    [60, 60, 1, 1],
    [1020, 60, -1, 1],
    [60, 1020, 1, -1],
    [1020, 1020, -1, -1],
  ];
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * bracketSize, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * bracketSize);
    ctx.stroke();
  });

  // ── EED MONOGRAM RING ───────────────────────────────────
  ctx.beginPath();
  ctx.arc(540, 160, 70, 0, Math.PI * 2);
  ctx.strokeStyle = "#2563EB";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(540, 160, 55, 0, Math.PI * 2);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "4px";
  ctx.fillText("EED", 540, 160);

  // ── GAME TITLE ───────────────────────────────────────────
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Book Jimmy's", 540, 260);

  ctx.fillStyle = "#3b82f6";
  ctx.font = "22px system-ui, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("LIBERIA WEEKLY CHALLENGE", 540, 328);

  // ── DIVIDER ──────────────────────────────────────────────
  ctx.strokeStyle = "#2563EB";
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(180, 385);
  ctx.lineTo(900, 385);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── SCORE CARD ───────────────────────────────────────────
  // Background card
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  roundRect(ctx, 120, 410, 840, 360, 24);
  ctx.fill();
  ctx.stroke();

  // Rating badge
  const ratingColors: Record<string, string> = {
    Champion: "#f59e0b",
    Expert: "#3b82f6",
    Player: "#22c55e",
    Newcomer: "#6b7280",
  };
  const ratingColor = ratingColors[data.rating] || "#6b7280";

  ctx.fillStyle = ratingColor;
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.letterSpacing = "3px";
  ctx.fillText(data.rating.toUpperCase(), 540, 445);

  // Score (big number)
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 140px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.letterSpacing = "0px";
  ctx.fillText(data.score.toLocaleString(), 540, 480);

  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText("points", 540, 628);

  // Stats row
  const stats = [
    { label: "Player", value: data.nickname },
    { label: "Time", value: formatTime(data.timeTakenSecs) },
    { label: "Week", value: `Week ${data.weekNumber}` },
  ];

  ctx.textBaseline = "top";
  stats.forEach((stat, i) => {
    const sx = 200 + i * 240;
    ctx.fillStyle = "#3b82f6";
    ctx.font = "18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "2px";
    ctx.fillText(stat.label.toUpperCase(), sx, 680);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.letterSpacing = "0px";
    ctx.fillText(stat.value, sx, 710);
  });

  // ── LIBERIAN FLAG ────────────────────────────────────────
  const flagW = 120;
  const flagH = 72;
  const flagX = 540 - flagW / 2;
  const flagY = 800;
  drawLiberiaFlag(ctx, flagX, flagY, flagW, flagH);

  // Flag border
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(flagX, flagY, flagW, flagH);

  // ── CALL TO ACTION ───────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "26px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Can you beat me?", 540, 900);

  ctx.fillStyle = "#2563EB";
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText("book-jimmys.vercel.app", 540, 940);

  // ── EED SIGNATURE ────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText("Built for Liberia · Designed by EED · © 2026", 540, 1000);

  return canvas.toDataURL("image/png");
}

// Helper — rounded rectangle path
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

// Generate the WhatsApp text share message
export function generateShareText(data: ShareCardData): string {
  const rating = data.rating;
  const ratingEmoji: Record<string, string> = {
    Champion: "👑",
    Expert: "🎯",
    Player: "✅",
    Newcomer: "🌱",
  };
  const emoji = ratingEmoji[rating] || "🎮";

  return `🇱🇷 *Book Jimmy's — Week ${data.weekNumber}*

${emoji} *${rating}*
🏆 Score: *${data.score.toLocaleString()} points*
⏱️ Time: *${formatTime(data.timeTakenSecs)}*
👤 Player: *${data.nickname}*

Can you beat me? 💪

🎮 Play now: book-jimmys.vercel.app
_Built for Liberia by EED_`;
}
