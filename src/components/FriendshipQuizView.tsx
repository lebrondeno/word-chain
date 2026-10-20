import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FRIENDSHIP_QUESTION_BANK,
  DEFAULT_QUIZ_LENGTH,
  MAX_CUSTOM_QUESTIONS,
  QUIZ_LENGTH_OPTIONS,
  getOptionText,
  getOptionImage,
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
import {
  saveCreatedQuizToHistory,
  savePlayedQuizToHistory,
  getQuizDraft,
  saveQuizDraft,
  clearQuizDraft,
} from '../lib/savedQuizzes';
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
  Check,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FriendshipQuizViewProps {
  initialQuizCode?: string;
  initialView?: 'results' | 'play' | 'create';
  onExit?: () => void;
}

type Mode = 'create_setup' | 'create_builder' | 'created_summary' | 'play_join' | 'play_answering' | 'play_result';

export const FriendshipQuizView: React.FC<FriendshipQuizViewProps> = ({
  initialQuizCode,
  initialView = 'play',
  onExit,
}) => {
  // Navigation & mode state
  const [mode, setMode] = useState<Mode>(() => {
    if (initialQuizCode) {
      return initialView === 'results' ? 'created_summary' : 'play_join';
    }
    const draft = getQuizDraft();
    if (draft && draft.builderQuestions && draft.builderQuestions.length > 0) {
      return 'create_builder';
    }
    return 'create_setup';
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------------------
  // CREATOR STATE
  // ----------------------------------------------------
  const [creatorName, setCreatorName] = useState<string>(() => {
    const draft = initialQuizCode ? null : getQuizDraft();
    if (draft?.creatorName) return draft.creatorName;
    return typeof window !== 'undefined' ? localStorage.getItem('word_chain_saved_name') || '' : '';
  });
  const [quizLength, setQuizLength] = useState<QuizLength>(() => {
    const draft = initialQuizCode ? null : getQuizDraft();
    return (draft?.quizLength as QuizLength) || DEFAULT_QUIZ_LENGTH;
  });
  const [builderQuestions, setBuilderQuestions] = useState<CreatorQuestionItem[]>(() => {
    const draft = initialQuizCode ? null : getQuizDraft();
    return draft?.builderQuestions || [];
  });
  const [currentBuilderIndex, setCurrentBuilderIndex] = useState<number>(() => {
    const draft = initialQuizCode ? null : getQuizDraft();
    return draft?.currentBuilderIndex || 0;
  });
  const [usedTemplateIds, setUsedTemplateIds] = useState<string[]>(() => {
    const draft = initialQuizCode ? null : getQuizDraft();
    return draft?.usedTemplateIds || [];
  });
  const [createdCode, setCreatedCode] = useState<string>('');
  const [createdLeaderboard, setCreatedLeaderboard] = useState<FriendshipSubmissionItem[]>([]);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(() => {
    const draft = initialQuizCode ? null : getQuizDraft();
    return Boolean(draft && draft.builderQuestions && draft.builderQuestions.length > 0);
  });

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

  // Persist draft while in builder mode
  useEffect(() => {
    if (mode === 'create_builder' && builderQuestions.length > 0) {
      saveQuizDraft({
        creatorName,
        quizLength,
        builderQuestions,
        currentBuilderIndex,
        usedTemplateIds,
      });
    }
  }, [mode, creatorName, quizLength, builderQuestions, currentBuilderIndex, usedTemplateIds]);

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
        setCreatedCode(res.quiz.code);
        setCreatorName(res.quiz.creator_name);

        const board = await getFriendshipLeaderboard(res.quiz.code, res.quiz.id);
        if (isCurrent) {
          setPlayLeaderboard(board);
          setCreatedLeaderboard(board);
        }

        if (initialView === 'results') {
          setMode('created_summary');
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            params.set('quiz', res.quiz.code);
            params.set('view', 'results');
            window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
          }
        } else {
          setMode('play_join');
        }
      } else {
        setError(res.error || 'Could not load quiz.');
      }
    }

    loadQuiz();
    return () => {
      isCurrent = false;
    };
  }, [initialQuizCode, initialView]);

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
      correctIndex: 0,
      isCustom: false,
    }));

    setBuilderQuestions(initialItems);
    setUsedTemplateIds(selected.map((t) => t.id));
    setCurrentBuilderIndex(0);
    setHasRestoredDraft(false);
    setMode('create_builder');
  };

  const handleDiscardDraft = () => {
    clearQuizDraft();
    setBuilderQuestions([]);
    setCurrentBuilderIndex(0);
    setUsedTemplateIds([]);
    setHasRestoredDraft(false);
    setMode('create_setup');
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

      // Clear draft since quiz is created
      clearQuizDraft();

      // Save to persistent user quiz history
      saveCreatedQuizToHistory({
        code: res.code,
        creatorName: creatorName.trim(),
        totalQuestions: builderQuestions.length,
        createdAt: new Date().toISOString(),
      });

      // Update URL to ?quiz=CODE&view=results
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        params.set('quiz', res.code);
        params.set('view', 'results');
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
      }

      // Fetch empty or initial leaderboard
      const board = await getFriendshipLeaderboard(res.code);
      setCreatedLeaderboard(board);

      if (typeof window !== 'undefined') {
        localStorage.setItem('word_chain_saved_name', creatorName.trim());
      }

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
      const checkRes = await checkFriendshipAnswer(
        activeQuiz.code,
        playIndex,
        optionIndex
      );

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
          // Finished all questions! Authoritative submission
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

          // Save to persistent user quiz history
          savePlayedQuizToHistory({
            code: activeQuiz.code,
            creatorName: activeQuiz.creator_name,
            totalQuestions: activeQuiz.questions.length,
            score: submitRes.score,
            createdAt: new Date().toISOString(),
          });

          // Update URL
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            params.set('quiz', activeQuiz.code);
            params.set('view', 'results');
            window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
          }

          // Fetch updated leaderboard
          const board = await getFriendshipLeaderboard(activeQuiz.code, activeQuiz.id);
          setPlayLeaderboard(board);
          setMode('play_result');

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
    ? `${window.location.origin}/?quiz=${createdCode || activeQuiz?.code || ''}`
    : '';

  // ----------------------------------------------------
  // RENDER: CREATOR SETUP
  // ----------------------------------------------------
  if (mode === 'create_setup') {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in text-slate-800">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-3 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#eef4fa] border border-blue-100 flex items-center justify-center mx-auto shadow-sm">
            <span className="text-3xl">🤝</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0b2545] tracking-tight">
            Friendship Test
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            Build a personalized quiz about your habits, food, travel and secrets. Share it on WhatsApp to see who knows you best!
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0b2545] mb-2">
              Your Name / Nickname
            </label>
            <input
              type="text"
              placeholder="e.g. Alex, Sam, Taylor..."
              maxLength={25}
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-[#3b4cca] focus:ring-2 focus:ring-blue-100 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0b2545] mb-2">
              How many questions?
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {QUIZ_LENGTH_OPTIONS.map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setQuizLength(len)}
                  className={`py-3 px-2 rounded-2xl border-2 font-bold text-sm transition flex flex-col items-center justify-center gap-1 ${
                    quizLength === len
                      ? 'border-[#1f9d55] bg-emerald-50 text-emerald-900 shadow-sm'
                      : 'border-slate-200 bg-[#f8fafc] text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg font-black">{len}</span>
                  <span className="text-[10px] uppercase tracking-wider">
                    {len === 10 ? 'Standard' : len === 15 ? 'Extended' : 'Ultimate'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleStartBuilding}
              className="w-full py-3.5 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <span>Start Choosing Your Answers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: CREATOR QUESTION BUILDER (Illustrated Arch Cards)
  // ----------------------------------------------------
  if (mode === 'create_builder') {
    const currentQ = builderQuestions[currentBuilderIndex];
    if (!currentQ) return null;
    const isLast = currentBuilderIndex === builderQuestions.length - 1;

    return (
      <div className="w-full max-w-xl mx-auto px-4 py-5 space-y-4 animate-fade-in text-slate-800">
        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0b2545]">Creating: {creatorName}&apos;s Quiz</span>
              {hasRestoredDraft && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Draft Restored
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold text-[11px]">
                Custom: {customCount}/{MAX_CUSTOM_QUESTIONS}
              </span>
              <button
                type="button"
                onClick={handleDiscardDraft}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition"
                title="Discard this draft and start over"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Top Progress Bubbles */}
          <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-1">
            {builderQuestions.map((_, idx) => {
              const isCurrent = idx === currentBuilderIndex;
              const isPast = idx < currentBuilderIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentBuilderIndex(idx)}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-[#0b2545] text-white ring-2 ring-[#d4b483] shadow-md scale-110'
                      : isPast
                      ? 'bg-emerald-100 text-[#1f9d55] border border-emerald-300'
                      : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                  }`}
                >
                  {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question & Options Area */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Skip This Question Button (Centered dark navy pill right above question text) */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleSwapCurrentQuestion}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#111c30] hover:bg-[#1a2b4a] text-white text-xs font-bold shadow-sm transition active:scale-95 border border-white/10"
              title="Swap with an unused question from the bank"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Skip This Question</span>
            </button>
          </div>

          {/* Question Heading: Large clean centered text */}
          <div className="text-center px-2">
            <h2 className="text-lg sm:text-2xl font-black text-[#0b2545] leading-snug max-w-md mx-auto">
              {currentQ.prompt}
            </h2>
            <p className="text-[11px] text-slate-400 mt-1">
              Select the option that is true for you
            </p>
          </div>

          {/* 2-Column Illustrated Option Cards (grid-cols-2) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
            {currentQ.options.map((opt, idx) => {
              const optText = getOptionText(opt);
              const optImage = getOptionImage(opt, idx);
              const isSelected = currentQ.correctIndex === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectAnswerForCurrent(idx)}
                  className={`group relative flex flex-col items-stretch justify-between rounded-3xl bg-white border-2 shadow-sm transition-all duration-200 overflow-hidden active:scale-[0.98] ${
                    isSelected
                      ? 'border-[#1f9d55] ring-4 ring-[#1f9d55]/30 shadow-md scale-[1.02]'
                      : 'border-slate-200 hover:border-[#d4b483] hover:shadow-md'
                  }`}
                >
                  {/* Selected checkmark badge */}
                  {isSelected && (
                    <div className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-[#1f9d55] text-white flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}

                  {/* White rounded upper body containing circular illustration framed by double gold ring */}
                  <div className="w-full pt-4 pb-3 px-2 flex items-center justify-center bg-white flex-1">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2px] border border-[#d4b483] bg-gradient-to-b from-[#faf6f0] to-[#f3ece0] flex items-center justify-center shadow-inner">
                      <div className="w-full h-full rounded-full border border-[#d4b483] overflow-hidden flex items-center justify-center bg-white shadow-xs">
                        <img
                          src={optImage}
                          alt={optText}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="eager"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Curved deep royal-navy bottom banner (#0b2545) with centered bold white text */}
                  <div
                    className={`w-full py-2.5 sm:py-3 px-2 rounded-b-[22px] transition-colors flex items-center justify-center text-center ${
                      isSelected ? 'bg-[#1f9d55]' : 'bg-[#0b2545] group-hover:bg-[#13315c]'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold text-white tracking-wide line-clamp-2 leading-tight">
                      {optText}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Action Row: Write Custom & Next */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleAddCustomQuestion}
              disabled={customCount >= MAX_CUSTOM_QUESTIONS && !currentQ.isCustom}
              className="py-2.5 px-3.5 rounded-full border border-blue-200 bg-blue-50 hover:bg-blue-100 text-[#3b4cca] text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40"
              title="Write your own custom question"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{currentQ.isCustom ? 'Edit Custom' : 'Write Custom'}</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={handleNextBuilderQuestion}
              className="py-2.5 px-5 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>Publishing Quiz...</span>
              ) : isLast ? (
                <>
                  <span>Finish &amp; Get Link</span>
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
          subtitle="See if you can get 100%!"
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
            <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              No responses yet. Share your quiz link to see friend scores here!
            </div>
          ) : (
            <div className="space-y-2">
              {createdLeaderboard.map((item, idx) => {
                const rankNum = item.rank || idx + 1;
                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white border border-slate-200 rounded-full flex items-center justify-between text-xs font-semibold shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#0b2545] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                        {rankNum}
                      </span>
                      <span className="text-slate-800 font-bold">{item.player_name}</span>
                    </div>
                    <span className="text-[#1f9d55] font-black mr-2">
                      {item.score} / {item.total}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onExit}
              className="flex-1 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to Game Hub</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: CHALLENGER ENTRY (JOIN QUIZ)
  // ----------------------------------------------------
  if (mode === 'play_join' && activeQuiz) {
    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in text-slate-800">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#3b4cca] to-[#1f9d55] text-white flex items-center justify-center mx-auto shadow-md text-2xl font-black">
            🤝
          </div>
          <span className="text-xs uppercase font-bold tracking-widest text-[#3b4cca] block">
            Friendship Challenge
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0b2545]">
            How well do you know {activeQuiz.creator_name}?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
            Answer {activeQuiz.total_questions} questions to find out your friendship score and see your rank on the leaderboard!
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs">
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

          {/* Quick Jump for Creator to View Leaderboard directly without taking quiz */}
          <div className="pt-2 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setCreatedCode(activeQuiz.code);
                setCreatorName(activeQuiz.creator_name);
                setCreatedLeaderboard(playLeaderboard);
                setMode('created_summary');
                if (typeof window !== 'undefined') {
                  const params = new URLSearchParams(window.location.search);
                  params.set('quiz', activeQuiz.code);
                  params.set('view', 'results');
                  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
                }
              }}
              className="w-full py-2.5 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-200"
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Are you {activeQuiz.creator_name}? View Live Leaderboard &amp; Results</span>
            </button>
          </div>
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
  // RENDER: CHALLENGER ANSWERING WITH 900ms REVEAL (Illustrated Arch Cards)
  // ----------------------------------------------------
  if (mode === 'play_answering' && activeQuiz) {
    const currentQ = activeQuiz.questions[playIndex];
    if (!currentQ) return null;

    return (
      <div className="w-full max-w-xl mx-auto px-4 py-5 space-y-4 animate-fade-in text-slate-800">
        {/* Progress Header Card */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#0b2545]">
              Playing: {activeQuiz.creator_name}&apos;s Quiz
            </span>
            <span className="text-slate-500 font-semibold">
              Question {playIndex + 1} of {activeQuiz.questions.length}
            </span>
          </div>

          {/* Top Progress Bubbles */}
          <div className="flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2 overflow-x-auto py-1 px-1">
            {activeQuiz.questions.map((_, idx) => {
              const isCurrent = idx === playIndex;
              const isPast = idx < playIndex;
              return (
                <div
                  key={idx}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-[#0b2545] text-white ring-2 ring-[#d4b483] shadow-md scale-110'
                      : isPast
                      ? 'bg-emerald-100 text-[#1f9d55] border border-emerald-300'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Question Heading & Options Area */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-4">
          <div className="text-center px-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Guess {activeQuiz.creator_name}&apos;s choice
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-[#0b2545] leading-snug max-w-md mx-auto">
              {currentQ.prompt}
            </h2>
          </div>

          {/* 2-Column Illustrated Option Cards with 900ms instant reveal */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
            {currentQ.options.map((opt, idx) => {
              const optText = getOptionText(opt);
              const optImage = getOptionImage(opt, idx);
              const isRevealing = revealState !== null;
              const isSelected = revealState?.selectedIndex === idx;
              const isCorrectOpt = revealState?.correctIndex === idx;
              const isWrongOpt = isRevealing && isSelected && !revealState.isCorrect;

              let borderRingClass = 'border-slate-200 hover:border-[#d4b483] hover:shadow-md';
              let bannerBg = 'bg-[#0b2545] group-hover:bg-[#13315c]';

              if (isRevealing) {
                if (isCorrectOpt) {
                  borderRingClass = 'border-[#1f9d55] ring-4 ring-[#1f9d55]/30 shadow-lg scale-[1.02]';
                  bannerBg = 'bg-[#1f9d55]';
                } else if (isWrongOpt) {
                  borderRingClass = 'border-rose-500 ring-4 ring-rose-500/30';
                  bannerBg = 'bg-rose-600';
                } else {
                  borderRingClass = 'border-slate-200 opacity-60';
                  bannerBg = 'bg-[#0b2545] opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isRevealing}
                  onClick={() => handlePickChallengerAnswer(idx)}
                  className={`group relative flex flex-col items-stretch justify-between rounded-3xl bg-white border-2 shadow-sm transition-all duration-200 overflow-hidden active:scale-[0.98] ${borderRingClass}`}
                >
                  {/* Reveal Badges */}
                  {isRevealing && isCorrectOpt && (
                    <div className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-[#1f9d55] text-white flex items-center justify-center shadow-md animate-bounce">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                  {isRevealing && isWrongOpt && (
                    <div className="absolute top-2.5 right-2.5 z-10 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
                      <XCircle className="w-4 h-4" />
                    </div>
                  )}

                  {/* White rounded upper body with double gold ring */}
                  <div className="w-full pt-4 pb-3 px-2 flex items-center justify-center bg-white flex-1">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-[2px] border border-[#d4b483] bg-gradient-to-b from-[#faf6f0] to-[#f3ece0] flex items-center justify-center shadow-inner">
                      <div className="w-full h-full rounded-full border border-[#d4b483] overflow-hidden flex items-center justify-center bg-white shadow-xs">
                        <img
                          src={optImage}
                          alt={optText}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="eager"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Curved deep royal-navy bottom banner (#0b2545) with white option text */}
                  <div
                    className={`w-full py-2.5 sm:py-3 px-2 rounded-b-[22px] transition-colors flex items-center justify-center text-center ${bannerBg}`}
                  >
                    <span className="text-xs sm:text-sm font-bold text-white tracking-wide line-clamp-2 leading-tight">
                      {optText}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: CHALLENGER RESULT (DONUT CHART & LEADERBOARD)
  // ----------------------------------------------------
  if (mode === 'play_result' && activeQuiz && finalScore) {
    const { score, total } = finalScore;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    // SVG Donut Chart constants
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    const forestGreenOffset = circumference - (circumference * percentage) / 100;

    return (
      <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in text-slate-800">
        {/* Top Result Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-black text-[#0b2545]">
            😍 Congrats {friendName}! 😍
          </h2>

          <div className="space-y-0.5">
            <p className="text-sm font-bold text-slate-700">
              You scored on {activeQuiz.creator_name}&apos;s quiz
            </p>
            <p className="text-xs text-slate-500">
              Now it&apos;s your turn. Create your own quiz and send it to your friends!
            </p>
          </div>

          {/* Two-tone SVG circular pie/donut score chart */}
          <div className="relative w-44 h-44 mx-auto my-3 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-[#3b4cca]"
                strokeWidth="20"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-[#0b6e27] transition-all duration-1000 ease-out"
                strokeWidth="20"
                strokeDasharray={circumference}
                strokeDashoffset={forestGreenOffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Stacked Fraction (Score / Total) centered */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-[#0b2545] tracking-tight">
                {score}
              </span>
              <div className="w-8 h-[2px] bg-slate-300 my-0.5" />
              <span className="text-base font-bold text-slate-500">
                {total}
              </span>
            </div>
          </div>

          {/* Viral CTA Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setCreatedCode('');
                setActiveQuiz(null);
                setMode('create_setup');
                if (typeof window !== 'undefined') {
                  const params = new URLSearchParams(window.location.search);
                  params.delete('quiz');
                  params.delete('view');
                  const qs = params.toString();
                  window.history.replaceState({}, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
                }
              }}
              className="w-full py-4 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-black text-sm shadow-lg shadow-emerald-700/25 transition flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Create Your Own Quiz</span>
            </button>
          </div>
        </div>

        {/* Who Knows Creator Best Leaderboard */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-base text-[#0b2545]">
                Who Knows {activeQuiz.creator_name} Best?
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              {playLeaderboard.length} Responses
            </span>
          </div>

          <div className="space-y-2">
            {playLeaderboard.map((item, idx) => {
              const rankNum = item.rank || idx + 1;
              const isMe = item.player_name.toLowerCase() === friendName.toLowerCase();

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-full flex items-center justify-between text-xs font-semibold shadow-xs transition ${
                    isMe
                      ? 'bg-emerald-50 border-2 border-[#1f9d55]'
                      : 'bg-white border border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#0b2545] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                      {rankNum}
                    </span>
                    <span className="text-slate-800 font-bold">
                      {item.player_name} {isMe && '(You)'}
                    </span>
                  </div>
                  <span className="text-[#1f9d55] font-black mr-2">
                    {item.score} / {item.total}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onExit}
              className="w-full py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Return to Game Hub</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
