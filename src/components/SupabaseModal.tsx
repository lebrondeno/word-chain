import React, { useState } from 'react';
import { getSupabaseConfig, saveSupabaseConfig, isSupabaseConfigured } from '../lib/supabase';
import { Database, Check, Copy, Key, AlertCircle, X } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose, onConfigSaved }) => {
  const current = getSupabaseConfig();
  const [url, setUrl] = useState(current.url);
  const [anonKey, setAnonKey] = useState(current.anonKey);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, anonKey);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onConfigSaved?.();
      onClose();
      window.location.reload();
    }, 800);
  };

  const handleCopySql = () => {
    const sqlScript = `-- Create Tables
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text UNIQUE NOT NULL,
  game_type text NOT NULL DEFAULT 'word_chain',
  category text NOT NULL DEFAULT 'cities',
  status text NOT NULL DEFAULT 'lobby',
  turn_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_turn_index int NOT NULL DEFAULT 0,
  used_words jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_letter text,
  turn_deadline timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES game_sessions(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  is_eliminated boolean DEFAULT false,
  joined_at timestamptz DEFAULT now()
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;

-- Enable RLS & Allow public access
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public sessions access" ON game_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public players access" ON game_players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
`;
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">Supabase Connection</h3>
              <p className="text-xs text-slate-400">Database & Realtime configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {configured ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 rounded-2xl">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-emerald-200">Supabase Connected:</span> Realtime sync & Postgres persistence are active.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-amber-950/40 border border-amber-800/40 text-amber-300 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold text-amber-200">Configuration Required:</span> Enter your Supabase Project URL and Anon Public Key below or provide them via <code className="bg-amber-950 px-1 py-0.5 rounded text-amber-200">.env</code> (<code className="text-amber-200">VITE_SUPABASE_URL</code>).
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Supabase Project URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-750 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-400" />
                Anon Public Key
              </label>
              <textarea
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={2}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-750 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono resize-none transition"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" /> Saved! Reloading...
                  </>
                ) : (
                  'Save & Connect'
                )}
              </button>
            </div>
          </form>

          {/* Quick Setup SQL helper */}
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                Postgres Schema & Realtime Setup
              </span>
              <button
                onClick={handleCopySql}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 bg-indigo-950/60 border border-indigo-800/40 px-2 py-1 rounded-lg transition"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied SQL!' : 'Copy SQL Script'}
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              In your Supabase project, go to <strong className="text-slate-300">SQL Editor</strong>, paste the script, and click <strong className="text-slate-300">Run</strong>. Schema file is also saved at <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">supabase/schema.sql</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
