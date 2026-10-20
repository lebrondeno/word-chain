export interface PromptData {
  id: string;
  engine: 'vote_reveal';
  category: 'general' | 'couples';
  prompt_text: string;
  options: [string, string];
}

export interface GameTypeInfo {
  id: 'word_chain' | 'vote_reveal';
  name: string;
  shortName: string;
  icon: string;
  description: string;
  categories: { id: string; name: string; icon: string; description: string }[];
}

export const VOTE_REVEAL_CATEGORIES: Record<string, { id: string; name: string; icon: string; description: string }> = {
  general: {
    id: 'general',
    name: 'General Fun',
    icon: '🎲',
    description: 'Quirky, funny & classic dilemmas for any group',
  },
  couples: {
    id: 'couples',
    name: 'Couples & Dates',
    icon: '❤️',
    description: 'Playful relationship & lifestyle scenarios',
  },
};

export const GAME_TYPES: Record<string, GameTypeInfo> = {
  word_chain: {
    id: 'word_chain',
    name: 'Word Chain',
    shortName: 'Word Chain',
    icon: '⛓️',
    description: 'Fast-paced elimination game linking words by last letter',
    categories: [
      { id: 'cities', name: 'Cities', icon: '🏙️', description: 'World cities & capitals' },
      { id: 'animals', name: 'Animals', icon: '🦁', description: 'Wildlife & pets' },
      { id: 'countries', name: 'Countries', icon: '🌍', description: 'Nations & territories' },
      { id: 'foods', name: 'Food & Drink', icon: '🍕', description: 'Dishes, fruits & snacks' },
      { id: 'movies', name: 'Movies', icon: '🎬', description: 'Iconic films' },
    ],
  },
  vote_reveal: {
    id: 'vote_reveal',
    name: 'Would You Rather',
    shortName: 'Vote & Reveal',
    icon: '🗳️',
    description: 'Vote privately on tough choices and reveal the group split',
    categories: [
      { id: 'general', name: 'General Fun', icon: '🎲', description: 'Quirky & classic dilemmas' },
      { id: 'couples', name: 'Couples & Dates', icon: '❤️', description: 'Relationship scenarios' },
    ],
  },
};

export const SEED_PROMPTS: PromptData[] = [
  // General (9 prompts)
  {
    id: '11111111-0001-4000-8000-000000000001',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: 'Would you rather always be 10 minutes late or always be 20 minutes early?',
    options: ['Always 10 minutes late', 'Always 20 minutes early'],
  },
  {
    id: '11111111-0001-4000-8000-000000000002',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: 'Would you rather be able to fly at 10 mph or teleport to a random location once a week?',
    options: ['Fly at 10 mph', 'Teleport randomly once a week'],
  },
  {
    id: '11111111-0001-4000-8000-000000000003',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: 'Would you rather have unlimited free food anywhere or unlimited free first-class flights?',
    options: ['Unlimited free food', 'Unlimited free first-class flights'],
  },
  {
    id: '11111111-0001-4000-8000-000000000004',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: 'Would you rather explore the deepest depths of the ocean or travel to outer space?',
    options: ['Explore deep ocean', 'Travel to outer space'],
  },
  {
    id: '11111111-0001-4000-8000-000000000005',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: 'Would you rather have all your thoughts broadcast out loud or never speak again?',
    options: ['Thoughts broadcast out loud', 'Never speak again'],
  },
  {
    id: '11111111-0001-4000-8000-000000000006',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: 'Would you rather live in a world without music or a world without movies and TV?',
    options: ['World without music', 'World without movies/TV'],
  },
  {
    id: '11111111-0001-4000-8000-000000000007',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: 'Would you rather always have cold coffee or always have lukewarm soda?',
    options: ['Always cold coffee', 'Always lukewarm soda'],
  },
  {
    id: '11111111-0001-4000-8000-000000000008',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: 'Would you rather possess superhuman strength or superhuman speed?',
    options: ['Super strength', 'Super speed'],
  },
  {
    id: '11111111-0001-4000-8000-000000000009',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: 'Would you rather know the exact date of your death or the exact cause?',
    options: ['Exact date', 'Exact cause'],
  },

  // Couples (7 prompts)
  {
    id: '11111111-0002-4000-8000-000000000001',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather share all passwords and browser histories or never check each other's phones?",
    options: ['Share all passwords', "Never check phones"],
  },
  {
    id: '11111111-0002-4000-8000-000000000002',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: 'Would you rather go on an ultra-luxury resort vacation or an exciting adventure road trip?',
    options: ['Luxury resort vacation', 'Adventure road trip'],
  },
  {
    id: '11111111-0002-4000-8000-000000000003',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: 'Would you rather cook an elaborate dinner together every night or get free gourmet takeout every night?',
    options: ['Cook dinner together', 'Free gourmet takeout'],
  },
  {
    id: '11111111-0002-4000-8000-000000000004',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: 'Would you rather always share the exact same sleep schedule or always crave the exact same foods?',
    options: ['Same sleep schedule', 'Same food cravings'],
  },
  {
    id: '11111111-0002-4000-8000-000000000005',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: 'Would you rather move into a stylish penthouse in a bustling city or a peaceful countryside farmhouse?',
    options: ['Bustling city penthouse', 'Countryside farmhouse'],
  },
  {
    id: '11111111-0002-4000-8000-000000000006',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: 'Would you rather have your partner pick all your outfits for a month or pick all your meals for a month?',
    options: ['Partner picks outfits', 'Partner picks meals'],
  },
  {
    id: '11111111-0002-4000-8000-000000000007',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: 'Would you rather binge a 10-season TV show together in one weekend or watch a new movie every night for a month?',
    options: ['Binge 10-season show', 'Movie every night'],
  },
];
