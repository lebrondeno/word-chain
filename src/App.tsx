import { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { GameProvider, useGame } from './context/GameContext';
import { Navbar } from './components/Navbar';
import { RoomEntryView } from './components/RoomEntryView';
import { LobbyView } from './components/LobbyView';
import { GameView } from './components/GameView';
import { FinishedView } from './components/FinishedView';
import { sanitizeRoomCode } from './lib/roomCode';

function MainContent() {
  const { session, loading } = useGame();
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  // Parse path-based or query-based join links e.g. /join/ABCD or ?join=ABCD
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const path = window.location.pathname;
    const match = path.match(/^\/join\/([a-zA-Z0-9]{3,6})/i);
    if (match && match[1]) {
      setInitialRoomCode(sanitizeRoomCode(match[1]));
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('join') || params.get('room') || params.get('code');
    if (codeParam) {
      setInitialRoomCode(sanitizeRoomCode(codeParam));
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-xs font-medium">Connecting to WordChain...</p>
      </div>
    );
  }

  // View routing driven by session and status
  const renderView = () => {
    if (!session) {
      return <RoomEntryView initialRoomCode={initialRoomCode} />;
    }

    switch (session.status) {
      case 'lobby':
        return <LobbyView />;
      case 'playing':
        return <GameView />;
      case 'finished':
        return <FinishedView />;
      default:
        return <RoomEntryView initialRoomCode={initialRoomCode} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      {/* Background Decorative Ambient Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl" />
      </div>

      <Navbar />

      <main className="relative z-10 flex-1 flex flex-col justify-start max-w-4xl w-full mx-auto pb-12">
        {renderView()}
      </main>

      <footer className="relative z-10 py-6 border-t border-slate-900 text-center text-[11px] text-slate-500 space-y-1">
        <div>Multiplayer Word Chain • Powered by React, Supabase & Realtime</div>
        <div className="italic text-slate-600">Made by lebrondeno</div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <GameProvider>
      <MainContent />
      <Analytics />
    </GameProvider>
  );
}

export default App;
