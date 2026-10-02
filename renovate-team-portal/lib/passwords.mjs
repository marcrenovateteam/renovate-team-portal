import { randomBytes, scrypt as nodeScrypt, timingSafeEqual, createHash } from 'node:crypto';
// OWASP's scrypt N=2^15, r=8, p=3 profile, with bounded memory.
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const derive = (password, salt) => new Promise((resolve, reject) => nodeScrypt(password, salt, 32, options, (error, result) => error ? reject(error) : resolve(result)));
export function validatePassword(password) {
  if (typeof password !== 'string' || [...password].length < 15 || [...password].length > 128) throw new Error('Use a password or passphrase of 15–128 characters.');
}
export function normalizeUsername(value) {
  const username = String(value ?? '').trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username)) throw new Error('Use 3–64 letters, numbers, periods, underscores, or hyphens for the username.');
  return username;
}
export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt$32768$8$3$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || [...password].length > 128) return false;
  const parts = typeof encoded === 'string' ? encoded.split('$') : [];
  const valid = parts.length === 6 && parts.slice(0,4).join('$') === 'scrypt$32768$8$3' && /^[a-f0-9]{32}$/.test(parts[4]) && /^[a-f0-9]{64}$/.test(parts[5]);
  // Missing accounts still perform the same password derivation.
  const key = await derive(password, valid ? parts[4] : '00000000000000000000000000000000');
  return valid && timingSafeEqual(key, Buffer.from(parts[5], 'hex'));
}
export const randomToken = () => randomBytes(32).toString('base64url');
export const tokenDigest = value => createHash('sha256').update(value).digest('hex');
