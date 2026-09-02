# ⛓️ WordChain — Live Multiplayer Word-Chain Game

A fast-paced, real-time multiplayer word-chain game built with **React + TypeScript + Vite**, **Supabase (Postgres + Realtime)**, and deployed seamlessly to **Vercel**.

---

## 🌟 Features

- **No Authentication Required**: Players join instantly using a unique 4-character room code and a display name.
- **Real-Time Multiplayer Sync**: One centralized Supabase Realtime subscription per session powers the lobby, live turns, countdown timers, and player elimination state.
- **Multi-Category Curated Dictionaries**: Built-in curated word lists (>250+ entries for Cities, plus Animals, Countries, Foods, and Movies) with instant client-side hints and server-side RPC atomic validation.
- **15-Second Turn Countdown**: Dynamic visual progress bar, ticking sound alerts, urgent warnings, and automatic player elimination on timeout.
- **Sound Effects & Haptics**: Built-in Web Audio API sound synthesis (ticks, turn alerts, correct chimes, error buzzers, and winner victory fanfare).
- **Celebratory Winner Screen**: Confetti celebration (`canvas-confetti`), game statistics, complete word chain recap, and 1-click "Play Again" to keep the lobby intact.
- **Mobile-First Responsive UI**: Dark glassmorphic design tailored for mobile browsers and desktops alike.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase

Create a Supabase project at [supabase.com](https://supabase.com).

#### Execute the Database Schema & Functions
Go to **SQL Editor** in your Supabase dashboard and run the contents of [`supabase/schema.sql`](./supabase/schema.sql):

```sql
-- 1. Create Tables
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

-- 2. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;

-- 3. Enable RLS with public anonymous access
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public sessions access" ON game_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public players access" ON game_players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
```

*(Optional atomic RPC functions like `submit_word`, `start_game`, `handle_timeout`, and `reset_game` are also included in [`supabase/schema.sql`](./supabase/schema.sql) for maximum concurrency protection).*

#### Set Environment Variables
Create a `.env` or `.env.local` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

*(You can also configure or change your Supabase connection directly in the app using the in-app Supabase Setup button!)*

### 3. Run Development Server
```bash
npm run dev
```

---

## 🎮 Game Rules & Flow

1. **Host Creates Game**: Generates a 4-character room code (e.g. `K9W2`) and selects the category.
2. **Players Join**: Friends open `yourapp.com/join/K9W2` or manually enter the code and display name.
3. **Host Starts Game**: Shuffles players, sets `status = 'playing'`, and sets the 15-second timer.
4. **Turns & Chain**:
   - The active player submits a word that **starts with the last letter** of the previous word.
   - Word must be in the curated category list and cannot have been used previously.
   - Valid submission updates `last_letter`, appends to `used_words`, advances to the next player, and resets the 15-second deadline.
5. **Timeout**: If the timer hits 0 before submission, the active player is eliminated (`is_eliminated = true`) and the turn passes.
6. **Victory**: When 1 active player remains, the game finishes, confetti fires, and the champion is crowned!

---

## 🚢 Vercel Deployment

Deploying to Vercel is one click:
1. Push to GitHub.
2. Import repository in [Vercel](https://vercel.com).
3. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy! The included `vercel.json` ensures direct join routes like `/join/:roomCode` resolve properly.
