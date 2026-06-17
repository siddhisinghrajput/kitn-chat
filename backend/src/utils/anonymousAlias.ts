const ADJECTIVES = [
  'Silent', 'Ghostly', 'Tactile', 'Clay', 'Shadowy',
  'Amber', 'Muted', 'Warm', 'Parchment', 'Vibrant',
  'Mystic', 'Hidden', 'Obscured', 'Clandestine', 'Vague'
];

const NOUNS = [
  'Companion', 'Runner', 'Whisperer', 'Vibe', 'Fox',
  'Owl', 'Phantom', 'Specter', 'Kith', 'Sage',
  'Ghost', 'Shadow', 'Panda', 'Eagle', 'Badger'
];

export function generateAnonymousAlias(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(10 + Math.random() * 90); // 2-digit number (10-99)
  return `${adj}${noun}${num}`;
}
