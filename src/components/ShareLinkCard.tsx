import React, { useState } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';

interface ShareLinkCardProps {
  url: string;
  code: string;
  title: string;
  gameType: 'word_chain' | 'vote_reveal' | 'friendship_quiz';
  subtitle?: string;
  shareMessage?: string;
}

export const ShareLinkCard: React.FC<ShareLinkCardProps> = ({
  url,
  code,
  title,
  gameType,
  subtitle = 'Share with friends on WhatsApp or copy link',
  shareMessage,
}) => {
  const [copied, setCopied] = useState(false);

  const messageText = shareMessage || `${title} 👉 ${url}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: messageText,
          url,
        });
      } catch {
        // User cancelled or not supported
      }
    } else {
      handleCopy();
    }
  };

  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3.5 text-left">
      {/* Header with Title and Thumbnail */}
      <div className="flex items-center gap-3">
        {/* Compact thumbnail icon */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-slate-100 overflow-hidden bg-[#eef4fa]">
          {gameType === 'word_chain' ? (
            <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none">
              <rect x="4" y="6" width="18" height="18" rx="4" fill="#3b4cca" />
              <text x="13" y="19" fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">W</text>
              <rect x="18" y="18" width="26" height="24" rx="6" fill="#1f9d55" />
              <circle cx="31" cy="30" r="7" stroke="#fff" strokeWidth="2.5" fill="none" />
              <path d="M31 30 L31 26 M31 30 L34 30" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : gameType === 'vote_reveal' ? (
            <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none">
              <rect x="4" y="8" width="18" height="32" rx="4" fill="#3b82f6" />
              <text x="13" y="28" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">A</text>
              <rect x="26" y="8" width="18" height="32" rx="4" fill="#f43f5e" />
              <text x="35" y="28" fill="#fff" fontSize="11" fontWeight="bold" textAnchor="middle">B</text>
              <polygon points="24,14 20,25 24,25 23,34 29,23 24,23" fill="#f59e0b" />
            </svg>
          ) : (
            <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none">
              <circle cx="24" cy="24" r="18" fill="#0b2545" />
              <circle cx="24" cy="24" r="14" stroke="#3b4cca" strokeWidth="4" fill="none" strokeDasharray="50 30" />
              <circle cx="24" cy="24" r="14" stroke="#1f9d55" strokeWidth="4" fill="none" strokeDasharray="30 50" strokeDashoffset="-25" />
              <text x="24" y="28" fill="#f59e0b" fontSize="13" fontWeight="bold" textAnchor="middle">⭐</text>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-sm text-slate-900 truncate">{title}</h4>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold tracking-wider shrink-0 border border-slate-200">
              {code}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        </div>
      </div>

      {/* URL Readonly Box */}
      <div className="flex items-center gap-2 bg-[#f8fafc] border border-slate-200 rounded-xl px-3 py-2">
        <input
          type="text"
          readOnly
          value={url}
          className="w-full bg-transparent text-xs text-slate-700 select-all font-mono outline-none truncate"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Action Buttons: WhatsApp & Native Share */}
      <div className="grid grid-cols-2 gap-2 pt-0.5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-sm transition active:scale-[0.98]"
        >
          {/* WhatsApp SVG Icon */}
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M12.031 2C6.51 2 2.02 6.49 2.02 12.012c0 1.989.585 3.844 1.6 5.405L2 22l4.743-1.572a9.96 9.96 0 005.288 1.503c5.521 0 10.012-4.49 10.012-10.012A9.99 9.99 0 0012.031 2zm0 18.232a8.21 8.21 0 01-4.225-1.168l-.304-.182-3.136 1.039 1.06-3.056-.2-.317a8.17 8.17 0 01-1.258-4.536c0-4.544 3.7-8.243 8.252-8.243 2.203 0 4.274.86 5.83 2.417a8.19 8.19 0 012.411 5.827c0 4.545-3.699 8.219-8.43 8.219zm4.515-6.166c-.247-.124-1.464-.722-1.691-.805-.227-.082-.392-.124-.557.124-.165.247-.639.805-.783.97-.144.165-.288.185-.536.062-.247-.124-1.045-.386-1.99-1.23-.736-.657-1.233-1.47-1.378-1.717-.144-.247-.015-.381.108-.504.111-.111.247-.289.371-.433.124-.144.165-.247.247-.412.083-.165.041-.31-.02-.433-.062-.124-.557-1.341-.763-1.836-.2-.482-.404-.417-.557-.425-.144-.008-.31-.01-.474-.01s-.433.062-.66.31c-.227.247-.866.846-.866 2.063s.887 2.393 1.01 2.558c.124.165 1.745 2.665 4.228 3.738.591.255 1.052.408 1.412.522.593.189 1.133.162 1.56.098.476-.071 1.464-.598 1.67-1.176.206-.577.206-1.072.144-1.175-.062-.103-.227-.165-.474-.289z" />
          </svg>
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleNativeShare}
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition active:scale-[0.98]"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{hasNativeShare ? 'Share App' : 'Copy Link'}</span>
        </button>
      </div>
    </div>
  );
};
