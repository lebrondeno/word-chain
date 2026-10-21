import { useState, useEffect } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Navbar } from './components/Navbar';
import { RoomEntryView } from './components/RoomEntryView';
import { LobbyView } from './components/LobbyView';
import { GameView } from './components/GameView';
import { FinishedView } from './components/FinishedView';
import { FriendshipQuizView } from './components/FriendshipQuizView';
import { PwaNotificationBanner } from './components/PwaNotificationBanner';
import { sanitizeRoomCode } from './lib/roomCode';
import { useHistoryLayer } from './hooks/useHistoryLayer';

function MainContent() {
  const { session, loading, localPlayer, leaveGame, resetGame } = useGame();

  const [initialRoomCode, setInitialRoomCode] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname;
    const match = path.match(/^\/join\/([a-zA-Z0-9]{3,6})/i);
    if (match && match[1]) {
      return sanitizeRoomCode(match[1]);
    }
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('join') || params.get('room') || params.get('code');
    return codeParam ? sanitizeRoomCode(codeParam) : '';
  });

  const [initialQuizCode, setInitialQuizCode] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    const quizParam = params.get('quiz');
    return quizParam ? quizParam.trim().toUpperCase() : '';
  });

  const [initialQuizView, setInitialQuizView] = useState<'results' | 'play' | 'create'>(() => {
    if (typeof window === 'undefined') return 'play';
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'results') return 'results';
    return params.get('quiz') ? 'play' : 'create';
  });

  const [isFriendshipQuizOpen, setIsFriendshipQuizOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return Boolean(params.get('quiz'));
  });

  // Listen for history back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const quizParam = params.get('quiz');
      const viewParam = params.get('view');
      if (quizParam) {
        setInitialQuizCode(quizParam.trim().toUpperCase());
        setInitialQuizView(viewParam === 'results' ? 'results' : 'play');
        setIsFriendshipQuizOpen(true);
        return;
      }

      const path = window.location.pathname;
      const match = path.match(/^\/join\/([a-zA-Z0-9]{3,6})/i);
      if (match && match[1]) {
        setInitialRoomCode(sanitizeRoomCode(match[1]));
        return;
      }

      const codeParam = params.get('join') || params.get('room') || params.get('code');
      if (codeParam) {
        setInitialRoomCode(sanitizeRoomCode(codeParam));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleReturnToHub = () => {
    setIsFriendshipQuizOpen(false);
    setInitialQuizCode('');
    // Remove query params if quiz was in URL
    if (typeof window !== 'undefined' && (window.location.search.includes('quiz=') || window.location.search.includes('view='))) {
      const params = new URLSearchParams(window.location.search);
      params.delete('quiz');
      params.delete('view');
      const qs = params.toString();
      const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(window.history.state, '', newUrl);
    }
  };

  const handleOpenQuiz = (code?: string, view?: 'results' | 'play' | 'create') => {
    setInitialQuizCode(code ? code.trim().toUpperCase() : '');
    setInitialQuizView(view || (code ? 'play' : 'create'));
    setIsFriendshipQuizOpen(true);
  };

  // Hardware / gesture Back navigation: every deeper screen holds a history
  // entry so Back steps Game -> Lobby -> Home Hub (never exits the PWA).
  useHistoryLayer(isFriendshipQuizOpen, () => {
    handleReturnToHub();
  });

  const hasSession = Boolean(session);
  const sessionStatus = session?.status;
  const isHostPlayer = Boolean(localPlayer?.isHost);

  // Layer 1: inside a room (lobby). Back leaves the room -> Home Hub.
  useHistoryLayer(hasSession, () => {
    leaveGame();
  });

  // Layer 2: an active / finished game on top of the lobby.
  useHistoryLayer(sessionStatus === 'playing' || sessionStatus === 'finished', () => {
    if (sessionStatus === 'finished') {
      void resetGame();
      return;
    }
    if (isHostPlayer) {
      if (typeof window !== 'undefined' && !window.confirm('End this game for everyone and return to the lobby?')) {
        return false;
      }
      void resetGame();
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm('Leave this game and return to the Home Hub?')) {
      return false;
    }
    leaveGame();
  });

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-[#3b4cca]/30 border-t-[#3b4cca] rounded-full animate-spin mb-4" />
        <p className="text-slate-600 text-xs font-semibold">Connecting to PartyHub...</p>
      </div>
    );
  }

  // View routing driven by mode, session and status
  const renderView = () => {
    // 1. If Friendship Quiz is active (or opened via ?quiz=xxxx)
    if (isFriendshipQuizOpen) {
      return (
        <FriendshipQuizView
          initialQuizCode={initialQuizCode}
          initialView={initialQuizView}
          onExit={handleReturnToHub}
        />
      );
    }

    // 2. Real-time Room Sessions
    if (!session) {
      return (
        <RoomEntryView
          initialRoomCode={initialRoomCode}
          onOpenFriendshipQuiz={(code, view) => handleOpenQuiz(code, view)}
        />
      );
    }

    switch (session.status) {
      case 'lobby':
        return <LobbyView />;
      case 'playing':
        return <GameView />;
      case 'finished':
        return <FinishedView />;
      default:
        return (
          <RoomEntryView
            initialRoomCode={initialRoomCode}
            onOpenFriendshipQuiz={(code, view) => handleOpenQuiz(code, view)}
          />
        );
    }
  };

  return (
    <div className="h-dvh bg-transparent text-slate-800 flex flex-col selection:bg-[#3b4cca] selection:text-white relative overflow-hidden">
      <Navbar
        onGoHome={handleReturnToHub}
        onOpenQuiz={(code, view) => handleOpenQuiz(code, view)}
        onCreateQuiz={() => handleOpenQuiz('', 'create')}
      />

      <PwaNotificationBanner />

      <main className="relative z-10 flex-1 min-h-0 flex flex-col justify-start max-w-4xl w-full mx-auto overflow-y-auto no-scrollbar pb-2">
        {renderView()}
      </main>
    </div>
  );
}

export function App() {
  return (
    <GameProvider>
      <MainContent />
    </GameProvider>
  );
}

export default App;
