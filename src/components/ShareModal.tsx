import React from 'react';
import { X, Share2 } from 'lucide-react';
import { ShareLinkCard } from './ShareLinkCard';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, roomCode }) => {
  if (!isOpen) return null;

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/join/${roomCode}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-900 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Invite Friends</h3>
              <p className="text-xs text-slate-500">Share room link or 4-letter code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <ShareLinkCard
            url={joinUrl}
            code={roomCode}
            title="Party Game Room"
            gameType="word_chain"
            subtitle="Share with friends to jump straight in"
          />
        </div>
      </div>
    </div>
  );
};
