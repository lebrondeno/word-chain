/**
 * Generates a clean, 4-character uppercase alphanumeric room code.
 * Excludes ambiguous characters (0, O, 1, I, L) to avoid player confusion.
 */
const ALLOWED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length: number = 4): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * ALLOWED_CHARS.length);
    code += ALLOWED_CHARS.charAt(randomIndex);
  }
  return code;
}

export function sanitizeRoomCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}
