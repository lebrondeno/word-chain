import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FRIENDSHIP_QUESTION_BANK,
  DEFAULT_QUIZ_LENGTH,
  MAX_CUSTOM_QUESTIONS,
  QUIZ_LENGTH_OPTIONS,
  type QuizLength,
  type CreatorQuestionItem,
} from '../data/friendshipPrompts';
import {
  createFriendshipQuiz,
  getFriendshipQuiz,
  checkFriendshipAnswer,
  submitFriendshipQuiz,
  getFriendshipLeaderboard,
  type FriendshipQuizData,
  type FriendshipSubmissionItem,
} from '../lib/friendshipService';
import { ShareLinkCard } from './ShareLinkCard';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Trophy,
  PlusCircle,
  RefreshCw,
  Home,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FriendshipQuizViewProps {
  initialQuizCode?: string;
  onExit?: () => void;
}

type Mode = 'create_setup' | 'create_builder' | 'created_summary' | 'play_join' | 'play_answering' | 'play_result';

export const FriendshipQuizView: React.FC<FriendshipQuizViewProps> = ({
  initialQuizCode,
  onExit,
}) => {
  // Navigation & mode state
  const [mode, setMode] = useState<Mode>(initialQuizCode ? 'play_join' : 'create_setup');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------------------
  // CREATOR STATE
  // ----------------------------------------------------
  const [creatorName, setCreatorName] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('word_chain_saved_name') || '' : '';
  });
  const [quizLength, setQuizLength] = useState<QuizLength>(DEFAULT_QUIZ_LENGTH);
  const [builderQuestions, setBuilderQuestions] = useState<CreatorQuestionItem[]>([]);
  const [currentBuilderIndex, setCurrentBuilderIndex] = useState<number>(0);
  const [usedTemplateIds, setUsedTemplateIds] = useState<string[]>([]);
  const [createdCode, setCreatedCode] = useState<string>('');
  const [createdLeaderboard, setCreatedLeaderboard] = useState<FriendshipSubmissionItem[]>([]);

  // Custom question modal state
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [customOptions, setCustomOptions] = useState<[string, string, string, string]>([
    'Option 1',
    'Option 2',
    'Option 3',
    'Option 4',
  ]);
  const [customCorrectIndex, setCustomCorrectIndex] = useState(0);

  // ----------------------------------------------------
  // CHALLENGER / PLAY STATE
  // ----------------------------------------------------
  const [activeQuiz, setActiveQuiz] = useState<FriendshipQuizData | null>(null);
  const [friendName, setFriendName] = useState<string>('');
  const [playIndex, setPlayIndex] = useState<number>(0);
  const [playAnswers, setPlayAnswers] = useState<number[]>([]);
  const [revealState, setRevealState] = useState<{
    selectedIndex: number;
    correctIndex: number;
    isCorrect: boolean;
  } | null>(null);
  const [finalScore, setFinalScore] = useState<{ score: number; total: number } | null>(null);
  const [playLeaderboard, setPlayLeaderboard] = useState<FriendshipSubmissionItem[]>([]);

  const isAnsweringRef = useRef(false);

  // Load quiz if initialQuizCode is passed
  useEffect(() => {
    if (!initialQuizCode) return;
    let isCurrent = true;

    async function loadQuiz() {
      setLoading(true);
      setError(null);
      const res = await getFriendshipQuiz(initialQuizCode!);
      if (!isCurrent) return;
      setLoading(false);

      if (res.success && res.quiz) {
        setActiveQuiz(res.quiz);
        setMode('play_join');
        // Pre-fetch leaderboard
        const board = await getFriendshipLeaderboard(res.quiz.code, res.quiz.id);
        if (isCurrent) setPlayLeaderboard(board);
      } else {
        setError(res.error || 'Could not load quiz.');
      }
    }

    loadQuiz();
    return () => {
      isCurrent = false;
    };
  }, [initialQuizCode]);

  // Count custom questions in builder
  const customCount = useMemo(() => {
    return builderQuestions.filter((q) => q.isCustom).length;
  }, [builderQuestions]);

  // ----------------------------------------------------
  // CREATOR ACTIONS
  // ----------------------------------------------------
  const handleStartBuilding = () => {
    if (!creatorName.trim()) {
      setError('Please enter your name to start creating!');
      return;
    }
    setError(null);

    // Pick random templates for the chosen length
    const shuffled = [...FRIENDSHIP_QUESTION_BANK].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, quizLength);

    const initialItems: CreatorQuestionItem[] = selected.map((t) => ({
      id: t.id,
      prompt: t.prompt,
      options: [...t.options],
      correctIndex: 0, // default first choice
      isCustom: false,
    }));

    setBuilderQuestions(initialItems);
    setUsedTemplateIds(selected.map((t) => t.id));
    setCurrentBuilderIndex(0);
    setMode('create_builder');
  };

  const handleSelectAnswerForCurrent = (optionIndex: number) => {
    setBuilderQuestions((prev) => {
      const next = [...prev];
      next[currentBuilderIndex] = {
        ...next[currentBuilderIndex],
        correctIndex: optionIndex,
      };
      return next;
    });
  };

  const handleNextBuilderQuestion = () => {
    if (currentBuilderIndex < builderQuestions.length - 1) {
      setCurrentBuilderIndex((prev) => prev + 1);
    } else {
      handleFinalizeQuiz();
    }
  };

  const handleSwapCurrentQuestion = () => {
    const currentQ = builderQuestions[currentBuilderIndex];
    const available = FRIENDSHIP_QUESTION_BANK.filter(
      (t) => !usedTemplateIds.includes(t.id) && t.id !== currentQ.id
    );

    if (available.length === 0) {
      setError('All template questions have been cycled through!');
      return;
    }

    const replacement = available[Math.floor(Math.random() * available.length)];
    setBuilderQuestions((prev) => {
      const next = [...prev];
      next[currentBuilderIndex] = {
        id: replacement.id,
        prompt: replacement.prompt,
        options: [...replacement.options],
        correctIndex: 0,
        isCustom: false,
      };
      return next;
    });

    setUsedTemplateIds((prev) => [...prev, replacement.id]);
    setError(null);
  };

  const handleAddCustomQuestion = () => {
    if (customCount >= MAX_CUSTOM_QUESTIONS) {
      setError(`Maximum ${MAX_CUSTOM_QUESTIONS} custom questions allowed per quiz!`);
      return;
    }
    setCustomPrompt('');
    setCustomOptions(['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4']);
    setCustomCorrectIndex(0);
    setIsCustomModalOpen(true);
  };

  const handleSaveCustomQuestion = () => {
    if (!customPrompt.trim()) {
      setError('Please write a prompt for your custom question.');
      return;
    }
    const cleanOptions = customOptions.map((o, idx) => o.trim() || `Option ${idx + 1}`);

    setBuilderQuestions((prev) => {
      const next = [...prev];
      next[currentBuilderIndex] = {
        id: `custom-${Date.now()}`,
        prompt: customPrompt.trim(),
        options: cleanOptions,
        correctIndex: customCorrectIndex,
        isCustom: true,
      };
      return next;
    });

    setIsCustomModalOpen(false);
    setError(null);
  };

  const handleFinalizeQuiz = async () => {
    setLoading(true);
    setError(null);

    const res = await createFriendshipQuiz(creatorName.trim(), builderQuestions);
    setLoading(false);

    if (res.success && res.code) {
      setCreatedCode(res.code);
      setMode('created_summary');

      // Fetch empty or initial leaderboard
      const board = await getFriendshipLeaderboard(res.code);
      setCreatedLeaderboard(board);

      // Save name for convenience
      if (typeof window !== 'undefined') {
        localStorage.setItem('word_chain_saved_name', creatorName.trim());
      }

      // Celebratory burst
      try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      } catch {
        // Safe
      }
    } else {
      setError(res.error || 'Failed to create quiz. Please try again.');
    }
  };

  // ----------------------------------------------------
  // CHALLENGER / PLAY ACTIONS
  // ----------------------------------------------------
  const handleStartChallenger = () => {
    if (!friendName.trim()) {
      setError('Please enter your name before starting!');
      return;
    }
    setError(null);
    setPlayIndex(0);
    setPlayAnswers([]);
    setRevealState(null);
    setMode('play_answering');
  };

  const handlePickChallengerAnswer = async (optionIndex: number) => {
    if (!activeQuiz || isAnsweringRef.current || revealState !== null) return;
    isAnsweringRef.current = true;

    try {
      // 1. Verify single answer via RPC / local service (anti-cheat)
      const checkRes = await checkFriendshipAnswer(
        activeQuiz.code,
        playIndex,
        optionIndex
      );

      // 2. Set 900ms reveal state
      setRevealState({
        selectedIndex: optionIndex,
        correctIndex: checkRes.correctOption,
        isCorrect: checkRes.isCorrect,
      });

      const nextAnswers = [...playAnswers, optionIndex];
      setPlayAnswers(nextAnswers);

      setTimeout(async () => {
        setRevealState(null);
        isAnsweringRef.current = false;

        if (playIndex < activeQuiz.questions.length - 1) {
          setPlayIndex((prev) => prev + 1);
        } else {
          // Finished all questions! Submit entire quiz authoritatively
          setLoading(true);
          const submitRes = await submitFriendshipQuiz(
            activeQuiz.code,
            friendName.trim(),
            nextAnswers
          );
          setLoading(false);

          setFinalScore({
            score: submitRes.score,
            total: submitRes.total,
          });

          // Fetch updated leaderboard
          const board = await getFriendshipLeaderboard(activeQuiz.code, activeQuiz.id);
          setPlayLeaderboard(board);
          setMode('play_result');

          // Confetti for score celebration
          try {
            confetti({
              particleCount: 75,
              spread: 70,
              origin: { y: 0.5 },
              colors: ['#3b4cca', '#1f9d55', '#fbbf24', '#f43f5e'],
            });
          } catch {
            // Safe
          }
        }
      }, 900);
    } catch {
      isAnsweringRef.current = false;
    }
  };

  const shareQuizUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?quiz=${createdCode || activeQuiz?.code || ''}`
    : '';

  // ----------------------------------------------------
  // RENDER: CREATOR SETUP
  // ----------------------------------------------------
  if (mode === 'create_setup') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in text-slate-800">
        {/* Banner Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-3 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#eef4fa] border border-blue-100 flex items-center justify-center mx-auto shadow-sm">
            <span className="text-3xl">🤝</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0b2545] tracking-tight">
            Friendship Test
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
            Create your personal <strong>"Know Me Better"</strong> quiz, share the link with friends on WhatsApp, and discover who knows you best!
          </p>
        </div>

        {/* Setup Form Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0b2545] mb-2">
              Your Name / Nickname
            </label>
            <input
              type="text"
              placeholder="e.g. Alex, Sarah, Leo..."
              maxLength={25}
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-[#3b4cca] focus:ring-2 focus:ring-blue-100 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0b2545] mb-2">
              Number of Questions
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {QUIZ_LENGTH_OPTIONS.map((len) => {
                const isSelected = quizLength === len;
                return (
                  <button
                    key={len}
                    type="button"
                    onClick={() => setQuizLength(len)}
                    className={`py-3 px-3 rounded-2xl border text-center transition font-bold text-sm ${
                      isSelected
                        ? 'bg-[#0b2545] border-[#0b2545] text-white shadow-sm'
                        : 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div>{len} Questions</div>
                    <span className="text-[10px] font-normal opacity-80">
                      {len === 10 ? 'Fast (2 min)' : len === 15 ? 'Classic' : 'Deep Dive'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartBuilding}
            className="w-full py-3.5 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Start Building My Quiz</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {onExit && (
          <div className="text-center">
            <button
              type="button"
              onClick={onExit}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5 py-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Game Hub</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: CREATOR STEP-BY-STEP BUILDER
  // ----------------------------------------------------
  if (mode === 'create_builder' && builderQuestions.length > 0) {
    const currentQ = builderQuestions[currentBuilderIndex];
    const isLast = currentBuilderIndex === builderQuestions.length - 1;
    const progressPercent = Math.round(((currentBuilderIndex + 1) / builderQuestions.length) * 100);

    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-4 animate-fade-in text-slate-800">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#0b2545] text-white text-xs font-bold">
              Q{currentBuilderIndex + 1} of {builderQuestions.length}
            </span>
            <span className="text-xs text-slate-500">Pick the answer true for you</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#3b4cca] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              Custom: {customCount}/{MAX_CUSTOM_QUESTIONS}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#3b4cca] to-[#1f9d55] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Question {currentBuilderIndex + 1}
            </span>
            <h3 className="text-xl font-black text-[#0b2545] leading-snug">
              {currentQ.prompt}
            </h3>
          </div>

          {/* 4 Answer Choice Buttons */}
          <div className="space-y-2.5 pt-1">
            {currentQ.options.map((opt, idx) => {
              const isSelected = currentQ.correctIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectAnswerForCurrent(idx)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/80 border-[#1f9d55] text-emerald-950 font-bold shadow-sm'
                      : 'bg-[#f8fafc] border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? 'bg-[#1f9d55] text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm">{opt}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-[#1f9d55] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Swap & Custom Action Bar */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSwapCurrentQuestion}
              className="py-2 px-3 rounded-xl border border-slate-200 bg-[#f8fafc] hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Replace with another prompt from the bank"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#3b4cca]" />
              <span>Swap Question</span>
            </button>

            <button
              type="button"
              onClick={handleAddCustomQuestion}
              disabled={customCount >= MAX_CUSTOM_QUESTIONS && !currentQ.isCustom}
              className="py-2 px-3 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#3b4cca] text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
              title="Write your own custom question"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{currentQ.isCustom ? 'Edit Custom' : 'Write Custom'}</span>
            </button>
          </div>

          {/* Next / Finish Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleNextBuilderQuestion}
              className="w-full py-3.5 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>Generating Quiz Code...</span>
              ) : isLast ? (
                <>
                  <span>Finish &amp; Get Share Link</span>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </>
              ) : (
                <>
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Custom Question Modal */}
        {isCustomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-50 text-[#3b4cca] rounded-xl border border-blue-100">
                    <PlusCircle className="w-4 h-4" />
                  </span>
                  <h4 className="font-bold text-base text-[#0b2545]">Write Custom Question</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                  Question Prompt
                </label>
                <input
                  type="text"
                  placeholder="e.g. What is my secret guilty pleasure?"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#3b4cca]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase text-slate-600">
                  4 Options (Select the correct one)
                </label>
                {customOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomCorrectIndex(idx)}
                      className={`w-7 h-7 rounded-full text-xs font-bold shrink-0 border transition ${
                        customCorrectIndex === idx
                          ? 'bg-[#1f9d55] text-white border-[#1f9d55]'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const copy: [string, string, string, string] = [...customOptions];
                        copy[idx] = e.target.value;
                        setCustomOptions(copy);
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#f8fafc] border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#3b4cca]"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomQuestion}
                  className="flex-1 py-2.5 rounded-full bg-[#1f9d55] text-white text-xs font-bold hover:bg-[#178044] transition shadow-sm"
                >
                  Save Question
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: CREATOR COMPLETED SUMMARY & LIVE LEADERBOARD
  // ----------------------------------------------------
  if (mode === 'created_summary') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in text-slate-800">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9 text-[#1f9d55]" />
          </div>
          <h2 className="text-2xl font-black text-[#0b2545]">Your Quiz Is Live!</h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            Send this link to your friends or group chat on WhatsApp. As they play, their scores will appear below!
          </p>
        </div>

        {/* Dedicated Share Link Card */}
        <ShareLinkCard
          url={shareQuizUrl}
          code={createdCode}
          title={`How well do you know ${creatorName}?`}
          gameType="friendship_quiz"
          subtitle={`${builderQuestions.length} questions • See if you can get 100%!`}
          shareMessage={`Hey! Test how well you really know me on my ${creatorName}'s Friendship Quiz 👉 ${shareQuizUrl}`}
        />

        {/* Live Leaderboard Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-[#0b2545]">
                Who Knows {creatorName} Best?
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {createdLeaderboard.length} Responses
            </span>
          </div>

          {createdLeaderboard.length === 0 ? (
            <div className="p-6 bg-[#f8fafc] border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">No submissions yet!</p>
              <p>Share your link on WhatsApp above to see scores roll in.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {createdLeaderboard.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs hover:border-slate-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0b2545] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {item.rank || idx + 1}
                    </div>
                    <span className="font-bold text-sm text-[#0b2545]">{item.player_name}</span>
                  </div>
                  <div className="text-sm font-black text-[#1f9d55] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    {item.score} / {item.total}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {onExit && (
          <div className="text-center">
            <button
              type="button"
              onClick={onExit}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5 py-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Return to Game Hub</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: CHALLENGER JOIN / INTRO SCREEN
  // ----------------------------------------------------
  if (mode === 'play_join') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in text-slate-800">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-3xl shadow-sm">
            ✨
          </div>
          <h2 className="text-2xl font-black text-[#0b2545]">
            How Well Do You Know {activeQuiz?.creator_name || 'Your Friend'}?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            Answer <strong>{activeQuiz?.total_questions || 10} questions</strong> and see your score on the live leaderboard!
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0b2545] mb-2">
              Enter Your Name
            </label>
            <input
              type="text"
              placeholder="e.g. Jordan, Mia, Chris..."
              maxLength={25}
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-[#3b4cca] focus:ring-2 focus:ring-blue-100 transition text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleStartChallenger}
            className="w-full py-3.5 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <span>Start Answering</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Leaderboard Preview */}
        {playLeaderboard.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-sm text-[#0b2545] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Current Leaderboard ({playLeaderboard.length} players)</span>
            </h3>
            <div className="space-y-2">
              {playLeaderboard.slice(0, 5).map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 bg-[#f8fafc] border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-semibold"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-[#0b2545] text-white flex items-center justify-center font-bold text-[10px]">
                      {item.rank || idx + 1}
                    </span>
                    <span className="text-slate-800">{item.player_name}</span>
                  </div>
                  <span className="text-[#1f9d55] font-black">{item.score} / {item.total}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: CHALLENGER ANSWERING WITH 900ms REVEAL
  // ----------------------------------------------------
  if (mode === 'play_answering' && activeQuiz) {
    const currentQ = activeQuiz.questions[playIndex];
    const progressPercent = Math.round(((playIndex + 1) / activeQuiz.questions.length) * 100);

    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-4 animate-fade-in text-slate-800">
        {/* Progress Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-[#0b2545] text-white text-xs font-bold">
            Question {playIndex + 1} of {activeQuiz.questions.length}
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {activeQuiz.creator_name}&apos;s Quiz
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#3b4cca] to-[#1f9d55] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
          <div className="space-y-1 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Guess {activeQuiz.creator_name}&apos;s answer
            </span>
            <h3 className="text-xl font-black text-[#0b2545] leading-snug">
              {currentQ.prompt}
            </h3>
          </div>

          {/* Options with 900ms Instant Reveal feedback */}
          <div className="space-y-2.5 pt-1">
            {currentQ.options.map((opt, idx) => {
              const isSelected = revealState?.selectedIndex === idx;
              const isCorrectOpt = revealState?.correctIndex === idx;

              let btnStyle = 'bg-[#f8fafc] border-slate-200 text-slate-700 hover:border-slate-300';
              if (revealState) {
                if (isCorrectOpt) {
                  btnStyle = 'bg-emerald-50 border-[#1f9d55] text-emerald-950 font-bold shadow-sm';
                } else if (isSelected && !revealState.isCorrect) {
                  btnStyle = 'bg-rose-50 border-rose-500 text-rose-950 font-bold shadow-sm';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={Boolean(revealState)}
                  onClick={() => handlePickChallengerAnswer(idx)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition flex items-center justify-between gap-3 ${btnStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isCorrectOpt && revealState
                          ? 'bg-[#1f9d55] text-white'
                          : isSelected && revealState && !revealState.isCorrect
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-sm font-semibold">{opt}</span>
                  </div>

                  {revealState && isCorrectOpt && (
                    <CheckCircle2 className="w-5 h-5 text-[#1f9d55] shrink-0" />
                  )}
                  {revealState && isSelected && !revealState.isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {revealState && (
            <div
              className={`p-3 rounded-2xl text-center text-xs font-bold animate-pop ${
                revealState.isCorrect
                  ? 'bg-emerald-50 text-[#1f9d55] border border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
              }`}
            >
              {revealState.isCorrect ? '🎉 Correct!' : '❌ Not quite! Correct answer revealed above.'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: SCORE CARD & LEADERBOARD (FINAL RESULT)
  // ----------------------------------------------------
  if (mode === 'play_result' && activeQuiz && finalScore) {
    const { score, total } = finalScore;
    const scoreFraction = total > 0 ? score / total : 0;
    const circumference = 2 * Math.PI * 45; // radius 45 -> ~282.74
    const greenOffset = circumference * (1 - scoreFraction);

    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in text-slate-800">
        {/* Top Result Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0b2545] tracking-tight">
            😍 Congrats {friendName}! 😍
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            You scored on <strong>{activeQuiz.creator_name}&apos;s</strong> quiz!
          </p>

          {/* Two-tone SVG circular pie/donut chart: Royal Blue (#3b4cca) & Forest Green (#0b6e27) */}
          <div className="relative w-40 h-40 mx-auto flex items-center justify-center my-2">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
              {/* Background circle: Deep Royal Navy / Royal Blue */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="#0b2545"
                stroke="#3b4cca"
                strokeWidth="10"
              />
              {/* Proportional arc: Forest Green */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#0b6e27"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={greenOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Stacked Fraction (bold white text) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none">
              <span className="text-3xl font-black leading-none">{score}</span>
              <div className="w-8 h-0.5 bg-white/70 my-1" />
              <span className="text-base font-bold text-blue-200 leading-none">{total}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Now it&apos;s your turn. Create your own quiz and send it to your friends!
          </p>

          {/* Viral CTA Button */}
          <button
            type="button"
            onClick={() => {
              setMode('create_setup');
              setCreatorName('');
              setCreatedCode('');
            }}
            className="w-full py-4 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-extrabold text-base shadow-md shadow-emerald-700/25 transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>Create Your Own Quiz</span>
          </button>
        </div>

        {/* Leaderboard Card: "Who Knows [Creator Name] Best?" */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-[#0b2545]">
                Who Knows {activeQuiz.creator_name} Best?
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Rankings
            </span>
          </div>

          <div className="space-y-2">
            {playLeaderboard.map((item, idx) => {
              const isCurrentFriend = item.player_name_normalized === friendName.trim().toLowerCase();
              return (
                <div
                  key={item.id || idx}
                  className={`p-3 rounded-full border flex items-center justify-between transition shadow-2xs ${
                    isCurrentFriend
                      ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0b2545] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {item.rank || idx + 1}
                    </div>
                    <span className="font-bold text-sm text-[#0b2545]">
                      {item.player_name} {isCurrentFriend ? '(You)' : ''}
                    </span>
                  </div>
                  <div className="text-sm font-black text-[#0b6e27] bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-100">
                    {item.score} / {item.total}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {onExit && (
          <div className="text-center">
            <button
              type="button"
              onClick={onExit}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1.5 py-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Back to Game Hub</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
};
