/**
 * Pure HTML5 Canvas Scorecard Generator ('📸 Share Brag Card')
 * Zero external dependencies. Generates a high-res 1080x1080 dark glass scorecard
 * with Web Share API and download fallbacks.
 */

import { getAvatarForPlayer } from './avatars';

export interface ScorecardOptions {
  gameTitle: string;
  playerName: string;
  avatarEmoji?: string;
  scoreText: string;
  subtitle?: string;
  roomCode?: string;
}

/**
 * Helper to draw a rounded rectangle on Canvas 2D
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generate an HTML5 Canvas element rendered with the scorecard graphic.
 */
export function generateScorecardCanvas(
  options: ScorecardOptions
): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const {
    gameTitle,
    playerName,
    avatarEmoji,
    scoreText,
    subtitle = 'PartyHub Champion',
    roomCode,
  } = options;

  const avatar = getAvatarForPlayer(playerName, avatarEmoji);

  // 1. Deep background gradient (#0B1120 -> #161F38)
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, '#0B1120');
  bgGrad.addColorStop(0.5, '#111827');
  bgGrad.addColorStop(1, '#161F38');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1080);

  // 2. Ambient radial blooms
  // Indigo top-left
  const indigoBloom = ctx.createRadialGradient(180, 180, 0, 180, 180, 500);
  indigoBloom.addColorStop(0, 'rgba(99, 102, 241, 0.35)');
  indigoBloom.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = indigoBloom;
  ctx.fillRect(0, 0, 1080, 1080);

  // Emerald/Cyan bottom-right
  const cyanBloom = ctx.createRadialGradient(900, 900, 0, 900, 900, 550);
  cyanBloom.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
  cyanBloom.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = cyanBloom;
  ctx.fillRect(0, 0, 1080, 1080);

  // 3. Central frosted glass card
  const cardX = 90;
  const cardY = 90;
  const cardW = 900;
  const cardH = 900;
  const cardRadius = 56;

  // Glass card shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 20;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fillStyle = 'rgba(17, 24, 39, 0.75)';
  ctx.fill();
  ctx.restore();

  // Glass card border with specular top highlight
  ctx.save();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  borderGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  borderGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.15)');
  borderGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = borderGrad;
  ctx.stroke();
  ctx.restore();

  // 4. Header: Logo & Game Mode
  ctx.save();
  // Logo badge circle
  const logoX = 160;
  const logoY = 175;
  ctx.beginPath();
  ctx.arc(logoX, logoY, 28, 0, Math.PI * 2);
  const logoGrad = ctx.createLinearGradient(logoX - 28, logoY - 28, logoX + 28, logoY + 28);
  logoGrad.addColorStop(0, '#3b4cca');
  logoGrad.addColorStop(1, '#10b981');
  ctx.fillStyle = logoGrad;
  ctx.fill();

  // Logo emoji
  ctx.font = '26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', logoX, logoY + 2);

  // Brand Name
  ctx.font = '900 36px "Plus Jakarta Sans", "Inter", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('PartyHub', logoX + 42, logoY + 2);

  // Game Title Pill Badge
  ctx.font = '800 20px "Plus Jakarta Sans", "Inter", sans-serif';
  const modeText = gameTitle.toUpperCase();
  const modeW = ctx.measureText(modeText).width + 36;
  const pillX = cardX + cardW - 70 - modeW;
  const pillY = logoY - 20;

  drawRoundedRect(ctx, pillX, pillY, modeW, 40, 20);
  ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.textAlign = 'center';
  ctx.fillText(modeText, pillX + modeW / 2, pillY + 21);
  ctx.restore();

  // 5. Player Avatar Medallion (Huge in center)
  const centerX = 540;
  const avatarY = 380;
  const avatarRadius = 90;

  ctx.save();
  // Outer glow
  ctx.beginPath();
  ctx.arc(centerX, avatarY, avatarRadius + 14, 0, Math.PI * 2);
  ctx.fillStyle = avatar.glowColor || 'rgba(34, 211, 238, 0.35)';
  ctx.fill();

  // Gradient Ring
  ctx.beginPath();
  ctx.arc(centerX, avatarY, avatarRadius, 0, Math.PI * 2);
  const ringGrad = ctx.createLinearGradient(
    centerX - avatarRadius,
    avatarY - avatarRadius,
    centerX + avatarRadius,
    avatarY + avatarRadius
  );
  ringGrad.addColorStop(0, avatar.hex || '#38bdf8');
  ringGrad.addColorStop(1, '#6366f1');
  ctx.fillStyle = ringGrad;
  ctx.fill();

  // Inner Dark Center
  ctx.beginPath();
  ctx.arc(centerX, avatarY, avatarRadius - 8, 0, Math.PI * 2);
  ctx.fillStyle = '#0B2545';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Avatar Emoji
  ctx.font = '88px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(avatar.emoji, centerX, avatarY + 8);
  ctx.restore();

  // 6. Player Name
  ctx.save();
  ctx.font = '800 46px "Plus Jakarta Sans", "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(playerName, centerX, 530);
  ctx.restore();

  // 7. Score Box Panel
  const panelW = 720;
  const panelH = 220;
  const panelX = centerX - panelW / 2;
  const panelY = 580;
  const panelRadius = 36;

  ctx.save();
  drawRoundedRect(ctx, panelX, panelY, panelW, panelH, panelRadius);
  const panelBg = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  panelBg.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  panelBg.addColorStop(1, 'rgba(255, 255, 255, 0.04)');
  ctx.fillStyle = panelBg;
  ctx.fill();

  // Specular top edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Score Numbers
  ctx.font = '900 88px "Plus Jakarta Sans", "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FBBF24'; // amber-400
  ctx.shadowColor = 'rgba(251, 191, 36, 0.4)';
  ctx.shadowBlur = 24;
  ctx.fillText(scoreText, centerX, panelY + 105);

  // Subtitle / Rank
  ctx.font = '600 28px "Inter", sans-serif';
  ctx.fillStyle = '#E2E8F0';
  ctx.shadowBlur = 0;
  ctx.fillText(subtitle, centerX, panelY + 165);
  ctx.restore();

  // 8. Footer Watermark & Room Code
  ctx.save();
  const footerY = 880;
  ctx.font = '600 24px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';

  const footerText = roomCode
    ? `🎮 Play free at partyhub.app • Room: ${roomCode}`
    : '🎮 Play instant party games free at partyhub.app';
  ctx.fillText(footerText, centerX, footerY);
  ctx.restore();

  return canvas;
}

/**
 * Generate scorecard as a Blob (PNG).
 */
export async function generateScorecardBlob(
  options: ScorecardOptions
): Promise<Blob | null> {
  const canvas = generateScorecardCanvas(options);
  if (!canvas) return null;

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png');
  });
}

/**
 * Generate scorecard as a data URL (PNG).
 */
export function generateScorecardDataUrl(options: ScorecardOptions): string | null {
  const canvas = generateScorecardCanvas(options);
  if (!canvas) return null;
  return canvas.toDataURL('image/png');
}

/**
 * Share scorecard via Web Share API or trigger download.
 */
export async function shareOrDownloadScorecard(
  options: ScorecardOptions
): Promise<{ success: boolean; method: 'share' | 'download' | 'clipboard' }> {
  const blob = await generateScorecardBlob(options);
  if (!blob) {
    return { success: false, method: 'clipboard' };
  }

  const fileName = `PartyHub-${options.gameTitle.replace(/\s+/g, '-')}-Scorecard.png`;
  const shareText = `Check out my ${options.gameTitle} score on PartyHub: ${options.scoreText}! Play along at ${
    typeof window !== 'undefined' ? window.location.origin : 'https://word-chain-one.vercel.app'
  }`;

  // Try Web Share API with image file
  if (
    typeof navigator !== 'undefined' &&
    'canShare' in navigator &&
    typeof navigator.canShare === 'function' &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `PartyHub — ${options.gameTitle}`,
          text: shareText,
          files: [file],
        });
        return { success: true, method: 'share' };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User dismissed share dialog
        return { success: true, method: 'share' };
      }
    }
  }

  // Fallback 1: Automatic file download
  if (typeof document !== 'undefined' && typeof URL !== 'undefined') {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // Also copy share text to clipboard
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareText).catch(() => {});
      }

      return { success: true, method: 'download' };
    } catch {
      // Continue to clipboard
    }
  }

  // Fallback 2: Copy link/text
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareText);
    return { success: true, method: 'clipboard' };
  }

  return { success: false, method: 'clipboard' };
}
