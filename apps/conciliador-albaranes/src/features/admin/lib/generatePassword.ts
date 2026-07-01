/**
 * Genera una contraseña aleatoria fácil de leer y copiar.
 *
 * Excluye caracteres ambiguos (`0/O`, `1/l/I`) y siempre incluye al menos
 * una letra en mayúscula, una minúscula, un dígito y un símbolo — cumple
 * con `passwordHash`/validación de 8+ caracteres del use case.
 */
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
  // Shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
