// NOTE: excluye chars ambiguos (0/O, 1/l/I) y garantiza al menos 1 lower + 1 upper + 1 digit + 1 symbol.
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGIT = '23456789';
const SYMBOL = '!@#$%^&*';
const ALL = LOWER + UPPER + DIGIT + SYMBOL;

function randomChar(alphabet: string): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return alphabet[arr[0] % alphabet.length];
}

export function generatePassword(length = 14): string {
  if (length < 8) length = 8;
  const chars: string[] = [
    randomChar(LOWER),
    randomChar(UPPER),
    randomChar(DIGIT),
    randomChar(SYMBOL),
  ];
  for (let i = chars.length; i < length; i++) {
    chars.push(randomChar(ALL));
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
