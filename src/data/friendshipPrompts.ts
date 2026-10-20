export interface FriendshipQuestionTemplate {
  id: string;
  category: 'habits' | 'food' | 'travel' | 'reactions' | 'preferences' | 'personality';
  prompt: string;
  options: [string, string, string, string];
}

export interface SanitizedQuestion {
  id: string;
  prompt: string;
  options: string[];
  isCustom?: boolean;
}

export interface CreatorQuestionItem {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  isCustom?: boolean;
}

export const QUIZ_LENGTH_OPTIONS = [10, 15, 20] as const;
export type QuizLength = typeof QUIZ_LENGTH_OPTIONS[number];
export const DEFAULT_QUIZ_LENGTH: QuizLength = 10;
export const MAX_CUSTOM_QUESTIONS = 3;

export const FRIENDSHIP_QUESTION_BANK: FriendshipQuestionTemplate[] = [
  // 1-6: Habits
  {
    id: 'fq-01',
    category: 'habits',
    prompt: 'What is my typical morning routine like?',
    options: ['Up at sunrise ready to conquer the day', 'Hit snooze 5 times before moving', 'Instantly check notifications & phone', 'Sleepwalk straight to the coffee machine'],
  },
  {
    id: 'fq-02',
    category: 'habits',
    prompt: 'How clean is my bedroom / living space usually?',
    options: ['Spotless and organized with pride', 'Organized chaos (I know where everything is)', 'Looks clean only when guests arrive', 'A complete hurricane zone'],
  },
  {
    id: 'fq-03',
    category: 'habits',
    prompt: 'How fast do I reply to texts and messages?',
    options: ['Within 5 seconds flat', 'Within a couple of hours', 'Read it, reply in my head, forget for 3 days', 'Only active at 1 AM'],
  },
  {
    id: 'fq-04',
    category: 'habits',
    prompt: 'What is my phone battery percentage usually at?',
    options: ['Always charged above 80%', 'Hovering around 40-60%', 'Living on 3% and pure anxiety', 'Always plugged into a portable bank'],
  },
  {
    id: 'fq-05',
    category: 'habits',
    prompt: 'What do I do when I get free weekend time?',
    options: ['Binge watch movies/series all day', 'Hang out with friends somewhere outside', 'Catch up on intense sleep and naps', 'Start an ambitious new side project'],
  },
  {
    id: 'fq-06',
    category: 'habits',
    prompt: 'How do I handle packing for a trip?',
    options: ['Pack a full week in advance with lists', 'Pack 2 hours before leaving the house', 'Overpack 15 extra outfits "just in case"', 'Toss 3 t-shirts in a backpack and go'],
  },

  // 7-12: Food & Drinks
  {
    id: 'fq-07',
    category: 'food',
    prompt: 'What is my go-to comfort food when craving something delicious?',
    options: ['Cheesy Pizza or Pasta', 'Juicy Burgers & Crispy Fries', 'Spicy Noodles / Ramen / Asian dishes', 'Sweet pastries, cakes & ice cream'],
  },
  {
    id: 'fq-08',
    category: 'food',
    prompt: 'What is my attitude towards spicy food?',
    options: ['The hotter, the better — bring the fire!', 'Enjoy mild/medium pleasant spice', 'Can tolerate a tiny bit if needed', 'Even black pepper is too spicy for me'],
  },
  {
    id: 'fq-09',
    category: 'food',
    prompt: 'How do I drink my coffee or tea?',
    options: ['Pitch black / strong with no sugar', 'Loaded with milk, cream and sweetness', 'I prefer iced drinks only', 'I do not drink hot drinks / I prefer juice & water'],
  },
  {
    id: 'fq-10',
    category: 'food',
    prompt: 'When deciding where to eat in a group, what do I do?',
    options: ['I already know exactly where we are going', 'Say "anything is fine" but secretly have preferences', 'Browse 10 menus for 45 minutes', 'Let everyone else decide and happily follow'],
  },
  {
    id: 'fq-11',
    category: 'food',
    prompt: 'What is my midnight snack of choice?',
    options: ['Instant noodles or salty chips', 'Leftovers straight out of the fridge', 'Chocolate bars, candy or cookies', 'A healthy glass of cold water'],
  },
  {
    id: 'fq-12',
    category: 'food',
    prompt: 'Can I cook a proper multi-course meal?',
    options: ['Yes! Chef-level gourmet skills', 'Can cook 3-4 staple dishes well', 'I can make eggs, ramen and toast', 'Food delivery apps are my true kitchen'],
  },

  // 13-18: Travel & Adventures
  {
    id: 'fq-13',
    category: 'travel',
    prompt: 'What is my dream vacation vibe?',
    options: ['Relaxing tropical beach with a cool drink', 'Lively historic city with museums & nightlife', 'Hike up misty mountains and deep nature', 'Ultra-luxury resort doing nothing all day'],
  },
  {
    id: 'fq-14',
    category: 'travel',
    prompt: 'On a long road trip or flight, what am I doing?',
    options: ['Curating the playlist / DJing the music', 'Asleep with an eye mask on', 'Snacking non-stop and looking out the window', 'Chatting everyone’s ear off'],
  },
  {
    id: 'fq-15',
    category: 'travel',
    prompt: 'Which superpower would I secretly pick?',
    options: ['Teleportation anywhere instantly', 'Mind reading and emotion detection', 'Time travel to past or future', 'Invisibility whenever I want'],
  },
  {
    id: 'fq-16',
    category: 'travel',
    prompt: 'How good is my internal GPS and sense of direction?',
    options: ['Human compass, never get lost', 'Fine as long as Google Maps is open', 'Can get lost inside a shopping mall', 'I turn the map upside down to navigate'],
  },
  {
    id: 'fq-17',
    category: 'travel',
    prompt: 'What is my preferred place to live long-term?',
    options: ['Bustling metropolis with skyscrapers', 'Peaceful coastal beach town', 'Cozy countryside farmhouse with acreage', 'Quiet green suburban neighborhood'],
  },
  {
    id: 'fq-18',
    category: 'travel',
    prompt: 'What kind of amusement park rides do I prefer?',
    options: ['The tallest, craziest roller coasters', 'Medium fun rides with zero upside-down loops', 'Water rides and bumper cars only', 'I will happily hold everyone’s bags at the bench'],
  },

  // 19-24: Reactions & Emotions
  {
    id: 'fq-19',
    category: 'reactions',
    prompt: 'When I hear juicy gossip or wild news, what is my reaction?',
    options: ['"TELL ME EVERYTHING RIGHT NOW!"', 'Cool and calm, nothing surprises me', 'Immediately research proof and facts', 'Keep it secret and never tell a soul'],
  },
  {
    id: 'fq-20',
    category: 'reactions',
    prompt: 'How do I handle horror movies or jump scares?',
    options: ['Laugh through it, completely fearless', 'Watch through fingers / cover my eyes', 'Scream out loud at every jump scare', 'Refuse to watch them under any circumstance'],
  },
  {
    id: 'fq-21',
    category: 'reactions',
    prompt: 'When I am angry or frustrated, what do I do first?',
    options: ['Go quiet and need space alone to cool down', 'Vent loudly to my best friends', 'Distract myself with music, gym, or games', 'Confront the issue immediately head-on'],
  },
  {
    id: 'fq-22',
    category: 'reactions',
    prompt: 'If an awkward silence happens in a conversation, what do I do?',
    options: ['Make a weird joke or talk to break the ice', 'Embrace the silence comfortably', 'Pretend to look busy on my phone', 'Smile nervously and look around the room'],
  },
  {
    id: 'fq-23',
    category: 'reactions',
    prompt: 'What makes me laugh the hardest?',
    options: ['Silly unhinged memes and internet humor', 'Dry, sarcastic and witty comments', 'People tripping or harmless fails', 'Inside jokes only my best friends get'],
  },
  {
    id: 'fq-24',
    category: 'reactions',
    prompt: 'When I receive an unexpected gift, what is my honest reaction?',
    options: ['Overjoyed and hype with big hugs', 'Heartfelt appreciation and thank-yous', 'A bit shy and embarrassed by attention', 'Immediately plan how to return the favor'],
  },

  // 25-30: Preferences & Entertainment
  {
    id: 'fq-25',
    category: 'preferences',
    prompt: 'What music genre would you most likely catch me listening to?',
    options: ['Pop, Dance & Chart Hits', 'Hip-Hop, Rap & R&B', 'Rock, Indie & Alternative', 'Chill Acoustic, Lo-Fi & Ambient'],
  },
  {
    id: 'fq-26',
    category: 'preferences',
    prompt: 'Are dogs or cats my spirit animal?',
    options: ['100% Dog lover (energetic & loyal)', '100% Cat lover (independent & cozy)', 'Love both equally!', 'Prefer reptiles, birds, or other animals'],
  },
  {
    id: 'fq-27',
    category: 'preferences',
    prompt: 'What is my preferred shopping style?',
    options: ['Online shopping delivered to my door', 'Physical mall browsing and trying things on', 'Only buy things when urgently necessary', 'Window shopping and leaving with nothing'],
  },
  {
    id: 'fq-28',
    category: 'preferences',
    prompt: 'What time of day am I at peak energy?',
    options: ['Early morning (6 AM - 10 AM)', 'Afternoon hustle (12 PM - 4 PM)', 'Evening golden hours (6 PM - 9 PM)', 'Night owl mode (11 PM - 3 AM)'],
  },
  {
    id: 'fq-29',
    category: 'preferences',
    prompt: 'Which season of the year is my favorite?',
    options: ['Sunny, warm Summer', 'Crisp, colorful Autumn', 'Cozy, sweater-weather Winter', 'Fresh, blossoming Spring'],
  },
  {
    id: 'fq-30',
    category: 'preferences',
    prompt: 'What kind of video or mobile games do I enjoy most?',
    options: ['Fast action, shooters or battle royales', 'Cozy simulation, puzzle or farming games', 'Story-rich RPG adventures', 'Party & multiplayer games with friends'],
  },

  // 31-36: Personality & Friendship
  {
    id: 'fq-31',
    category: 'personality',
    prompt: 'Am I more of an introvert, extrovert, or ambivert?',
    options: ['True Extrovert (energized by people)', 'True Introvert (needs quiet recharge)', 'Ambivert (depends on the crowd and day)', 'Extreme homebody who loves select people'],
  },
  {
    id: 'fq-32',
    category: 'personality',
    prompt: 'What role do I naturally play in our friend group?',
    options: ['The Planner who organizes everyone', 'The Comedian who makes everyone laugh', 'The Therapist who listens and gives advice', 'The Wild Card who is down for anything'],
  },
  {
    id: 'fq-33',
    category: 'personality',
    prompt: 'How good am I at keeping big secrets?',
    options: ['Vault status — take it to the grave', 'Keep it unless my best friend asks', 'Terrible at keeping my own secrets', 'I forget the secret within 24 hours anyway'],
  },
  {
    id: 'fq-34',
    category: 'personality',
    prompt: 'How do I handle shopping impulse purchases?',
    options: ['Think for 3 weeks before buying anything', 'See it, want it, buy it within 10 seconds', 'Put it in the online cart and leave it forever', 'Strictly stick to my pre-written budget'],
  },
  {
    id: 'fq-35',
    category: 'personality',
    prompt: 'What is my biggest everyday pet peeve?',
    options: ['People being chronically late', 'Loud chewing or bad table manners', 'Slow walkers or slow drivers in front of me', 'People not returning borrowed items'],
  },
  {
    id: 'fq-36',
    category: 'personality',
    prompt: 'If you had to describe my overall life motto in one phrase:',
    options: ['"Work hard, enjoy life to the fullest"', '"Everything happens for a good reason"', '"Keep it simple, avoid unnecessary drama"', '"Let us make unforgettable memories!"'],
  },
];
