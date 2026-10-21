export interface PromptData {
  id: string;
  engine: 'vote_reveal' | 'most_likely' | 'trivia' | 'higher_lower';
  category: string;
  prompt_text: string;
  options: [string, string] | string[] | null;
  correct_answer?: string;
  numeric_value?: number;
}

export interface GameTypeInfo {
  id: 'word_chain' | 'vote_reveal' | 'friendship_test' | 'tic_tac_toe' | 'trivia' | 'higher_lower' | 'most_likely';
  name: string;
  shortName: string;
  icon: string;
  description: string;
  categories: { id: string; name: string; icon: string; description: string; hasDifficulty?: boolean }[];
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
  majority_rules: {
    id: 'majority_rules',
    name: 'Majority Rules',
    icon: '🙋',
    description: 'Binary funny & opinion questions',
  },
  boys_debate: {
    id: 'boys_debate',
    name: "Boys' Debate",
    icon: '🗣️',
    description: 'Funny controversial yes/no takes',
  },
  church_banter: {
    id: 'church_banter',
    name: 'Church Banter',
    icon: '⛪',
    description: 'Fellowship, worship & church-life scenarios',
  },
  boys_banter: {
    id: 'boys_banter',
    name: "Boys' Banter",
    icon: '🎮',
    description: 'Sports, gaming & guy-talk dilemmas',
  },
};

export const MOST_LIKELY_CATEGORIES: Record<string, { id: string; name: string; icon: string; description: string }> = {
  general: {
    id: 'general',
    name: 'General',
    icon: '👀',
    description: "Classic who's-most-likely prompts for any group",
  },
};

export const TRIVIA_CATEGORIES: Record<string, { id: string; name: string; icon: string; description: string }> = {
  general_knowledge: {
    id: 'general_knowledge',
    name: 'General Knowledge',
    icon: '🧠',
    description: 'A little bit of everything',
  },
  sports: {
    id: 'sports',
    name: 'Sports',
    icon: '⚽',
    description: 'Athletes, teams & sporting moments',
  },
  geography: {
    id: 'geography',
    name: 'Geography',
    icon: '🌍',
    description: 'Countries, capitals & landmarks',
  },
  animals: {
    id: 'animals',
    name: 'Animals',
    icon: '🦁',
    description: 'Wildlife, pets & the animal kingdom',
  },
  history: {
    id: 'history',
    name: 'History',
    icon: '📜',
    description: 'Events, eras & historical figures',
  },
};

export const HIGHER_LOWER_CATEGORIES: Record<
  string,
  { id: string; name: string; icon: string; description: string; hasDifficulty?: boolean }
> = {
  random_numbers: {
    id: 'random_numbers',
    name: 'Random Numbers',
    icon: '🔢',
    description: 'Procedurally generated - choose your difficulty',
    hasDifficulty: true,
  },
  population: {
    id: 'population',
    name: 'World Populations',
    icon: '🌆',
    description: 'City & country population figures',
  },
};

export const HIGHER_LOWER_DIFFICULTIES: { id: string; name: string; description: string }[] = [
  { id: 'easy', name: 'Easy', description: 'Big gaps between numbers' },
  { id: 'medium', name: 'Medium', description: 'Moderate gaps' },
  { id: 'hard', name: 'Hard', description: 'Numbers often close' },
  { id: 'expert', name: 'Expert', description: 'Razor-thin margins' },
];

export const ALL_GAMES_COUNT = 7;

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
      { id: 'majority_rules', name: 'Majority Rules', icon: '🙋', description: 'Binary funny & opinion questions' },
      { id: 'boys_debate', name: "Boys' Debate", icon: '🗣️', description: 'Funny controversial yes/no takes' },
      { id: 'church_banter', name: 'Church Banter', icon: '⛪', description: 'Fellowship & church-life scenarios' },
      { id: 'boys_banter', name: "Boys' Banter", icon: '🎮', description: 'Sports, gaming & guy-talk dilemmas' },
    ],
  },
  friendship_test: {
    id: 'friendship_test',
    name: 'Friendship Test',
    shortName: 'Friend Quiz',
    icon: '🤝',
    description: 'Personalized "Know Me Better" quiz with viral WhatsApp leaderboard',
    categories: [
      { id: 'classic', name: 'Classic Besties', icon: '✨', description: '10 to 20 illustrated questions' },
    ],
  },
  tic_tac_toe: {
    id: 'tic_tac_toe',
    name: 'Tic Tac Toe',
    shortName: 'Tic Tac Toe',
    icon: '⭕',
    description: 'Classic 2-player grid strategy with multiplayer and local pass & play / AI bot mode',
    categories: [],
  },
  trivia: {
    id: 'trivia',
    name: '20-Second Challenge',
    shortName: 'Trivia',
    icon: '⚡',
    description: 'Answer fast — you only get 20 seconds per multiple-choice question',
    categories: [
      { id: 'general_knowledge', name: 'General Knowledge', icon: '🧠', description: 'A little bit of everything' },
      { id: 'sports', name: 'Sports', icon: '⚽', description: 'Athletes, teams & sporting moments' },
      { id: 'geography', name: 'Geography', icon: '🌍', description: 'Countries, capitals & landmarks' },
      { id: 'animals', name: 'Animals', icon: '🦁', description: 'Wildlife, pets & the animal kingdom' },
      { id: 'history', name: 'History', icon: '📜', description: 'Events, eras & historical figures' },
    ],
  },
  higher_lower: {
    id: 'higher_lower',
    name: 'Higher or Lower',
    shortName: 'Higher/Lower',
    icon: '📈',
    description: 'Guess if the next number or population is higher or lower — one miss and you are out',
    categories: [
      { id: 'random_numbers', name: 'Random Numbers', icon: '🔢', description: 'Procedurally generated with difficulty', hasDifficulty: true },
      { id: 'population', name: 'World Populations', icon: '🌆', description: 'City & country population stats' },
    ],
  },
  most_likely: {
    id: 'most_likely',
    name: "Who's Most Likely",
    shortName: 'Most Likely',
    icon: '👀',
    description: 'Vote for the friend in the room who best fits each prompt',
    categories: [
      { id: 'general', name: 'General', icon: '👀', description: "Classic who's-most-likely prompts" },
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
  {
    id: '11111111-0001-4000-8000-000000000010',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather have all your search history from the past 5 years made public or have your screen time permanently displayed on your forehead?",
    options: ["Public search history", "Screen time on forehead"],
  },
  {
    id: '11111111-0001-4000-8000-000000000011',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather only be able to listen to music through your phone speaker or only be able to watch videos at 240p resolution?",
    options: ["Phone speaker audio", "240p video resolution"],
  },
  {
    id: '11111111-0001-4000-8000-000000000012',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather give up all streaming services (Netflix, Spotify, YouTube) or give up all social media apps forever?",
    options: ["Give up streaming services", "Give up social media"],
  },
  {
    id: '11111111-0001-4000-8000-000000000013',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather always have 1% battery remaining on your phone or always have a 1-bar fluctuating Wi-Fi connection?",
    options: ["Perpetual 1% battery", "1-bar slow Wi-Fi"],
  },
  {
    id: '11111111-0001-4000-8000-000000000014',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather never be able to skip any video ads or have every text message you send delayed by 15 minutes?",
    options: ["Unskippable video ads", "15-minute text delay"],
  },
  {
    id: '11111111-0001-4000-8000-000000000015',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather be famous on TikTok with 10M followers or secretly earn $150k/year at a chill work-from-home job?",
    options: ["10M TikTok fame", "Quiet $150k WFH job"],
  },
  {
    id: '11111111-0001-4000-8000-000000000016',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather have a private chef who cooks all your meals or a personal chauffeur driving you everywhere?",
    options: ["Personal private chef", "Personal chauffeur"],
  },
  {
    id: '11111111-0001-4000-8000-000000000017',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather only communicate through 3-minute voice notes or only communicate through memes and GIFs?",
    options: ["3-minute voice notes", "Memes & GIFs only"],
  },
  {
    id: '11111111-0001-4000-8000-000000000018',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather accidentally reply-all to a 500-person company email or send an embarrassing selfie to your family group chat?",
    options: ["Company reply-all", "Embarrassing selfie to family"],
  },
  {
    id: '11111111-0001-4000-8000-000000000019',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather always feel like you are about to sneeze but never do, or have an unscratchable itch between your shoulder blades?",
    options: ["Perpetual sneeze feeling", "Unscratchable back itch"],
  },
  {
    id: '11111111-0001-4000-8000-000000000020',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather wake up at 5:00 AM every single day feeling fully energized or sleep in until 11:00 AM every day?",
    options: ["Wake at 5 AM energized", "Sleep in until 11 AM"],
  },
  {
    id: '11111111-0001-4000-8000-000000000021',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather have every song you listen to turn into an acoustic ukulele cover or an aggressive drill remix?",
    options: ["Ukulele acoustic covers", "Aggressive drill remixes"],
  },
  {
    id: '11111111-0001-4000-8000-000000000022',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather always have slightly wet socks inside your shoes or a tiny pebble in your shoe that you can never remove?",
    options: ["Slightly wet socks", "Unremovable tiny pebble"],
  },
  {
    id: '11111111-0001-4000-8000-000000000023',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather be able to pause time for 1 hour every day or rewind time by 5 minutes once every week?",
    options: ["Pause time 1 hour daily", "Rewind 5 minutes weekly"],
  },
  {
    id: '11111111-0001-4000-8000-000000000024',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather live without air conditioning in extreme summer heat or without heating in freezing winter?",
    options: ["No AC in summer heat", "No heating in freezing winter"],
  },
  {
    id: '11111111-0001-4000-8000-000000000025',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather be fluent in every spoken human language or be able to talk and communicate with animals?",
    options: ["Every human language", "Talk with animals"],
  },
  {
    id: '11111111-0001-4000-8000-000000000026',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather always have an empty fridge with an unlimited takeout budget, or a gourmet-stocked fridge with zero takeout allowed?",
    options: ["Unlimited takeout delivery", "Gourmet home cooking only"],
  },
  {
    id: '11111111-0001-4000-8000-000000000027',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather have your daily life narrated aloud by Morgan Freeman or have dramatic anime battle music play whenever you walk?",
    options: ["Narrated by Morgan Freeman", "Anime battle background music"],
  },
  {
    id: '11111111-0001-4000-8000-000000000028',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather win a $5 million lottery right now or be guaranteed supreme happiness and perfect health until age 95?",
    options: ["Instant $5M lottery", "Guaranteed health & joy to 95"],
  },
  {
    id: '11111111-0001-4000-8000-000000000029',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather always have cold pillows on both sides or never have to fold laundry or make your bed again?",
    options: ["Cold pillows forever", "Never fold laundry/make bed"],
  },
  {
    id: '11111111-0001-4000-8000-000000000030',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather be stuck on a 14-hour flight next to a screaming toddler or someone with intense body odor?",
    options: ["Screaming toddler neighbor", "Intense body odor neighbor"],
  },
  {
    id: '11111111-0001-4000-8000-000000000031',
    engine: 'vote_reveal',
    category: 'general',
    prompt_text: "Would you rather only eat pizza for dinner for a whole year or never eat pizza again for the rest of your life?",
    options: ["Pizza for dinner for a year", "Never eat pizza again"],
  },
  {
    id: '11111111-0002-4000-8000-000000000008',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather your partner be 10/10 hilarious with average looks or 10/10 gorgeous with a completely dry sense of humor?",
    options: ["10/10 hilarious banter", "10/10 gorgeous looks"],
  },
  {
    id: '11111111-0002-4000-8000-000000000009',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather accidentally like your partner's ex's 6-year-old Instagram photo or have your partner read through all your archived DMs?",
    options: ["Like partner's ex's photo", "Partner reads archived DMs"],
  },
  {
    id: '11111111-0002-4000-8000-000000000010',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather your partner be an obsessive clean freak who cleans 3 hours daily or a messy creative who leaves clothes everywhere?",
    options: ["Obsessive clean freak", "Messy creative chaos"],
  },
  {
    id: '11111111-0002-4000-8000-000000000011',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather always have to sleep in separate beds for maximum comfort or cuddle every night even in scorching summer heat?",
    options: ["Separate beds for sleep", "Cuddle even in summer heat"],
  },
  {
    id: '11111111-0002-4000-8000-000000000012',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather know the exact number of people your partner has kissed or never know anything about their dating past?",
    options: ["Know exact dating numbers", "Know zero about their past"],
  },
  {
    id: '11111111-0002-4000-8000-000000000013',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather have your partner forget your birthday or forget your 5-year relationship anniversary?",
    options: ["Forget birthday", "Forget 5-year anniversary"],
  },
  {
    id: '11111111-0002-4000-8000-000000000014',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather go on a romantic double date with your ex or with your in-laws who disagree with everything you say?",
    options: ["Double date with ex", "Double date with in-laws"],
  },
  {
    id: '11111111-0002-4000-8000-000000000015',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather your partner be terrible at picking gifts but great at emotional support, or buy amazing luxury gifts but be emotionally aloof?",
    options: ["Great support, bad gifts", "Amazing gifts, emotionally aloof"],
  },
  {
    id: '11111111-0002-4000-8000-000000000016',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather share one single phone with your partner for a month or spend two weeks with zero contact while on vacation?",
    options: ["Share one phone for a month", "Two weeks zero contact"],
  },
  {
    id: '11111111-0002-4000-8000-000000000017',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather your partner be a chronic loud snorer or someone who aggressively steals all blankets in their sleep?",
    options: ["Chronic loud snorer", "Aggressive blanket thief"],
  },
  {
    id: '11111111-0002-4000-8000-000000000018',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather always have to take couple selfies everywhere you go or be strictly forbidden from ever posting your partner online?",
    options: ["Couple selfies everywhere", "Never post partner online"],
  },
  {
    id: '11111111-0002-4000-8000-000000000019',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather have your partner be best friends with their ex or have your partner dislike your closest best friend?",
    options: ["Partner besties with ex", "Partner dislikes my bestie"],
  },
  {
    id: '11111111-0002-4000-8000-000000000020',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather always have your partner pick which movies/shows to watch or always have your partner pick which restaurants to eat at?",
    options: ["Partner picks movies", "Partner picks restaurants"],
  },
  {
    id: '11111111-0002-4000-8000-000000000021',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather your partner surprise you with an adrenaline skydive date or a relaxing full-day luxury spa retreat?",
    options: ["Adrenaline skydive date", "Relaxing spa retreat"],
  },
  {
    id: '11111111-0002-4000-8000-000000000022',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather always win every argument with your partner or have peaceful compromises where neither person is right or wrong?",
    options: ["Always win arguments", "Peaceful calm compromises"],
  },
  {
    id: '11111111-0002-4000-8000-000000000023',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather your partner give you a 2-hour back massage every week or do all the dishes and kitchen cleanups every week?",
    options: ["Weekly 2-hour massage", "Does all dishes & cleanup"],
  },
  {
    id: '11111111-0002-4000-8000-000000000024',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather fall in love at first sight with an instant spark or build an unbreakable romance gradually from best friends?",
    options: ["Love at first sight spark", "Slow burn friends to lovers"],
  },
  {
    id: '11111111-0002-4000-8000-000000000025',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather have a lavish 300-guest fairy tale wedding or elope privately on an exotic island and save all the cash?",
    options: ["Lavish 300-guest wedding", "Private elopement + save cash"],
  },
  {
    id: '11111111-0002-4000-8000-000000000026',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather your partner be a terrible cook who tries hard with love or an expert chef who refuses to cook on weekends?",
    options: ["Terrible cook with love", "Chef who refuses to cook weekends"],
  },
  {
    id: '11111111-0002-4000-8000-000000000027',
    engine: 'vote_reveal',
    category: 'couples',
    prompt_text: "Would you rather your partner be addicted to video games for 3 hours a day or addicted to online shopping and clothing hauls?",
    options: ["3 hours daily video games", "Addicted to shopping hauls"],
  },
];

// Fallback seed prompts for "Who's Most Likely"
export const SEED_MOST_LIKELY_PROMPTS: PromptData[] = [
  {
    id: 'ml-001',
    engine: 'most_likely',
    category: 'general',
    prompt_text: "Who's most likely to become famous one day?",
    options: null,
  },
  {
    id: 'ml-002',
    engine: 'most_likely',
    category: 'general',
    prompt_text: "Who's most likely to sleep through an important meeting or event?",
    options: null,
  },
  {
    id: 'ml-003',
    engine: 'most_likely',
    category: 'general',
    prompt_text: "Who's most likely to disappear from the group chat for months and reappear like nothing happened?",
    options: null,
  },
  {
    id: 'ml-004',
    engine: 'most_likely',
    category: 'general',
    prompt_text: "Who's most likely to win an argument just by being stubborn, not by being right?",
    options: null,
  },
  {
    id: 'ml-005',
    engine: 'most_likely',
    category: 'general',
    prompt_text: "Who's most likely to still be awake at 3am for no real reason?",
    options: null,
  },
  {
    id: 'ml-006',
    engine: 'most_likely',
    category: 'general',
    prompt_text: "Who's most likely to accidentally send a screenshot to the person they screenshotted?",
    options: null,
  },
  {
    id: 'ml-007',
    engine: 'most_likely',
    category: 'general',
    prompt_text: "Who's most likely to survive a zombie apocalypse through sheer luck?",
    options: null,
  },
  {
    id: 'ml-008',
    engine: 'most_likely',
    category: 'general',
    prompt_text: "Who's most likely to impulse buy something completely ridiculous?",
    options: null,
  },
];

// Fallback seed prompts for "20-Second Challenge" (Trivia)
export const SEED_TRIVIA_PROMPTS: PromptData[] = [
  {
    id: 'tr-001',
    engine: 'trivia',
    category: 'general_knowledge',
    prompt_text: 'What is the rarest blood type in humans?',
    options: ['AB-Negative', 'O-Positive', 'B-Negative', 'A-Negative'],
    correct_answer: 'AB-Negative',
  },
  {
    id: 'tr-002',
    engine: 'trivia',
    category: 'general_knowledge',
    prompt_text: 'Which planet is known as the Morning Star?',
    options: ['Venus', 'Mars', 'Jupiter', 'Mercury'],
    correct_answer: 'Venus',
  },
  {
    id: 'tr-003',
    engine: 'trivia',
    category: 'sports',
    prompt_text: 'How many players are on the field for one team in baseball?',
    options: ['9', '11', '7', '10'],
    correct_answer: '9',
  },
  {
    id: 'tr-004',
    engine: 'trivia',
    category: 'geography',
    prompt_text: 'What is the capital city of Australia?',
    options: ['Canberra', 'Sydney', 'Melbourne', 'Brisbane'],
    correct_answer: 'Canberra',
  },
  {
    id: 'tr-005',
    engine: 'trivia',
    category: 'animals',
    prompt_text: 'What is the only mammal capable of true sustained flight?',
    options: ['Bat', 'Flying Squirrel', 'Sugar Glider', 'Colugo'],
    correct_answer: 'Bat',
  },
  {
    id: 'tr-006',
    engine: 'trivia',
    category: 'history',
    prompt_text: 'In what year did the Apollo 11 moon landing take place?',
    options: ['1969', '1965', '1971', '1973'],
    correct_answer: '1969',
  },
];

// Fallback seed data for "World Populations" Higher or Lower
export const SEED_POPULATION_PROMPTS: { id: string; label: string; value: number }[] = [
  { id: 'pop-1', label: 'Tokyo, Japan', value: 37400000 },
  { id: 'pop-2', label: 'Delhi, India', value: 30290000 },
  { id: 'pop-3', label: 'Shanghai, China', value: 27050000 },
  { id: 'pop-4', label: 'São Paulo, Brazil', value: 22040000 },
  { id: 'pop-5', label: 'Mexico City, Mexico', value: 21780000 },
  { id: 'pop-6', label: 'Cairo, Egypt', value: 20900000 },
  { id: 'pop-7', label: 'Dhaka, Bangladesh', value: 21000000 },
  { id: 'pop-8', label: 'Mumbai, India', value: 20410000 },
  { id: 'pop-9', label: 'New York City, USA', value: 18800000 },
  { id: 'pop-10', label: 'London, UK', value: 9000000 },
  { id: 'pop-11', label: 'Paris, France', value: 2140000 },
  { id: 'pop-12', label: 'Sydney, Australia', value: 5312000 },
];

