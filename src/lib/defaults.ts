/**
 * Default values for events and typography
 * Used for fast retrieval and reverting to defaults
 * Matches elegant-invite templates
 */

export const DEFAULT_EVENT_DESCRIPTIONS: Record<string, string> = {
  'mandap muhurat': "Seeking the Blessings of Lord Ganesha for a Joyous Beginning\n (Alongside Mehendi)",
  'mandap': "Seeking the Blessings of Lord Ganesha for a Joyous Beginning\n (Alongside Mehendi)",
  'mameru': "With Blessings from the Maternal Family\n \n(Followed by Lunch)",
  'haldi': "As turmeric's golden hues meet the glow of love, the day blossoms into beautiful shades of sunshine, laughter and memories that will last a lifetime",
  'mehendi': "A celebration of colors, joy and the beautiful bond between friends and family\n(Dinner and Dancing)",
  'bhakti sandhya': "An evening of Devotional Music, Blessings and Spiritual togetherness\n (5:30 to 7:00 PM - Dinner)",
  'bhakti': "An evening of Devotional Music, Blessings and Spiritual togetherness\n (Dinner)",
  'jaan aagman': "A grand ceremonial procession marking the groom's joyous arrival, filled with music, celebration and blessings as he walks toward the sacred union",
  'baraat': "A grand ceremonial procession marking the groom's joyous arrival, filled with music, celebration and blessings as he walks toward the sacred union",
  'hast melap': "A sacred and soulful ritual where two hands are joined, two hearts are united and two families are bound together in love, blessings and lifelong togetherness",
  'wedding': "A sacred and soulful ritual where two hands are joined, two hearts are united and two families are bound together in love, blessings and lifelong togetherness",
  'reception': "A grand celebration honoring love, togetherness and new beginnings\nChauvihar Facility Available\n (Followed by Dinner)",
  'dinner and dancing': "An evening of celebration, joy and togetherness\n (Dinner and Dancing)",
  'sangeet': "A celebration of music, dance and the bonds that unite us\n (Dinner and Dancing)",
  'wedding ceremony': "The sacred union of two hearts and families",
  'anniversary': "A celebration of love, togetherness and cherished memories",
};

export const DEFAULT_AMBIENT_EFFECTS: Record<string, 'petals' | 'lights' | 'rice_roses' | 'stars' | 'none'> = {
  'mandap': 'petals',
  'mandap muhurat': 'petals',
  'mameru': 'petals',
  'haldi': 'petals',
  'mehendi': 'petals',
  'bhakti': 'lights',
  'bhakti sandhya': 'lights',
  'jaan aagman': 'rice_roses',
  'baraat': 'rice_roses',
  'hast melap': 'rice_roses',
  'wedding': 'rice_roses',
  'reception': 'stars',
  'dinner and dancing': 'stars',
  'sangeet': 'lights',
  'wedding ceremony': 'rice_roses',
  'anniversary': 'petals',
};

export const DEFAULT_THEME_TEXTS = {
  blessing_intro: {
    text: "With the divine grace & blessings of,",
    fontFamily: "font-body",
    fontSize: "text-2xl",
    color: "text-sage-dark",
    isItalic: true,
    isCustomized: false,
  },
  main_invite: {
    text: "we warmly seek your gracious presence and blessings as we celebrate the union of two hearts and families.",
    fontFamily: "font-body",
    fontSize: "text-2xl",
    color: "text-black",
    isItalic: true,
    isCustomized: false,
  },
  closing_message: {
    text: "As they embark on their journey of love and togetherness, your presence will make their special day even more memorable.",
    fontFamily: "font-body",
    fontSize: "text-2xl",
    color: "text-black",
    isItalic: true,
    isCustomized: false,
  },
};

export const getDefaultDescriptionForEvent = (eventName: string): string => {
  const lowerName = eventName.toLowerCase();
  
  // Direct match
  if (DEFAULT_EVENT_DESCRIPTIONS[lowerName]) {
    return DEFAULT_EVENT_DESCRIPTIONS[lowerName];
  }
  
  // Fuzzy match - check if event name contains any key
  for (const [key, description] of Object.entries(DEFAULT_EVENT_DESCRIPTIONS)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return description;
    }
  }
  
  // Fallback: generic description
  return "A joyous celebration of love and togetherness";
};

export const getDefaultAmbientEffectForEvent = (eventName: string): 'petals' | 'lights' | 'rice_roses' | 'stars' | 'none' => {
  const lowerName = eventName.toLowerCase();
  
  // Direct match
  if (DEFAULT_AMBIENT_EFFECTS[lowerName]) {
    return DEFAULT_AMBIENT_EFFECTS[lowerName];
  }
  
  // Fuzzy match
  for (const [key, effect] of Object.entries(DEFAULT_AMBIENT_EFFECTS)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return effect;
    }
  }
  
  // Fallback
  return 'petals';
};
