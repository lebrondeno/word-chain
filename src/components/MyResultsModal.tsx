import React, { useState } from 'react';
import {
  X,
  Trophy,
  Copy,
  Check,
  Trash2,
  Share2,
  Sparkles,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import {
  getMySavedQuizzes,
  removeQuizFromHistory,
  type UserSavedQuiz,
} from '../lib/savedQuizzes';

interface MyResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenQuiz: (code: string, view?: 'results' | 'play') => void;
  onCreateNew?: () => void;
}

export const MyResultsModal: React.FC<MyResultsModalProps> = ({
  isOpen,
  onClose,
  onOpenQuiz,
  onCreateNew,
}) => {
  const [quizzes, setQuizzes] = useState<UserSavedQuiz[]>(() => getMySavedQuizzes());
  const [filter, setFilter] = useState<'all' | 'created' | 'played'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopyLink = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/?quiz=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDelete = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Remove quiz ${code} from your saved results?`)) {
      const updated = removeQuizFromHistory(code);
      setQuizzes(updated);
    }
  };

  const filtered = quizzes.filter((q) => {
    if (filter === 'created') return q.isCreator;
    if (filter === 'played') return !q.isCreator || q.myScore !== undefined;
    return true;
  });

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-900 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#0b2545] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">My Quizzes &amp; Live Results</h3>
              <p className="text-xs text-blue-200">Track your friend scores and view leaderboards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex px-6 pt-4 pb-2 gap-2 border-b border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              filter === 'all'
                ? 'bg-[#0b2545] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            All Quizzes ({quizzes.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('created')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              filter === 'created'
                ? 'bg-[#0b2545] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Created by Me ({quizzes.filter((q) => q.isCreator).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('played')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              filter === 'played'
                ? 'bg-[#0b2545] text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Played by Me ({quizzes.filter((q) => !q.isCreator || q.myScore !== undefined).length})
          </button>
        </div>

        {/* Quiz List */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 border border-amber-200 mx-auto flex items-center justify-center">
                <Trophy className="w-8 h-8" />
              </div>
              <h4 className="font-black text-slate-800 text-base">No Quizzes Found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {filter === 'created'
                  ? 'You haven’t created a quiz yet. Build your personalized Friendship Test and challenge your circle!'
                  : 'Your created and answered quizzes will be saved here so you can inspect live friend leaderboards anytime.'}
              </p>
              {onCreateNew && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCreateNew();
                  }}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white text-xs font-bold shadow-md transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Friendship Quiz</span>
                </button>
              )}
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.code}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-[#3b4cca]/40 hover:shadow-md transition space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0b2545] text-white font-mono font-bold text-xs tracking-wider">
                        {item.code}
                      </span>
                      {item.isCreator && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          Creator
                        </span>
                      )}
                      {item.myScore !== undefined && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-600" />
                          <span>Scored {item.myScore} / {item.totalQuestions}</span>
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mt-1.5">
                      {item.isCreator ? 'Your Friendship Quiz' : `${item.creatorName}'s Friendship Quiz`}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        {item.totalQuestions} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Top quick actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(item.code, e)}
                      title="Copy Share Link"
                      className="p-2 text-slate-500 hover:text-[#3b4cca] hover:bg-slate-100 rounded-lg transition"
                    >
                      {copiedCode === item.code ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.code, e)}
                      title="Remove from history"
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main CTA */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenQuiz(item.code, 'results');
                    }}
                    className="flex-1 py-2 px-3 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-300" />
                    <span>View Live Results &amp; Leaderboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(item.code, e)}
                    className="py-2 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1"
                  >
                    {copiedCode === item.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Quizzes stay saved on this device even after closing the browser.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-full transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
